// src/systems/TimeCalendarSystem.ts - Clock, day phases, weather state, & 28-day 5-season calendar hooks
import { CalendarDate, Season, TimeOfDay, WeatherType } from '../types/stardew.types';
import { DayOfWeek } from '../types/npc.types';

export type MinuteCallback = (date: CalendarDate) => void;
export type PhaseCallback = (newPhase: TimeOfDay, oldPhase: TimeOfDay, date: CalendarDate) => void;
export type DayCallback = (day: number, date: CalendarDate) => void;
export type SeasonCallback = (season: Season, year: number) => void;
export type WeatherCallback = (weather: WeatherType, date: CalendarDate) => void;

export class TimeCalendarSystem {
  private date: CalendarDate;
  private minuteTickAccumulator = 0;
  private timeScale = 1.0;
  private paused = false;

  // Multi-subscriber listener arrays
  private minuteListeners: MinuteCallback[] = [];
  private phaseListeners: PhaseCallback[] = [];
  private dayListeners: DayCallback[] = [];
  private seasonListeners: SeasonCallback[] = [];
  private weatherListeners: WeatherCallback[] = [];

  // Legacy single callbacks for backward compatibility
  private onMinuteCallback?: MinuteCallback;
  private onDayCallback?: (date: CalendarDate) => void;
  private onSeasonCallback?: SeasonCallback;

  constructor(initialSeason: Season = 'spring', initialDay = 1, initialHour = 15, initialMinute = 15) {
    this.date = {
      year: 1,
      season: initialSeason,
      day: initialDay,
      hour: initialHour,
      minute: initialMinute,
      timePhase: this.calculateTimePhase(initialHour),
      weather: 'sunny'
    };
  }

  getDate(): CalendarDate {
    return { ...this.date };
  }

  getTotalMinutes(): number {
    return this.date.hour * 60 + this.date.minute;
  }

  getDayOfWeek(day?: number): DayOfWeek {
    const d = day !== undefined ? day : this.date.day;
    const days: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    return days[((d - 1) % 7 + 7) % 7];
  }

  calculateTimePhase(hour: number): TimeOfDay {
    if (hour >= 5 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 20) return 'sunset';
    if (hour >= 20 && hour < 23) return 'night';
    return 'midnight';
  }

  getFormattedTime(): { timeString: string; phaseString: string } {
    const period = this.date.hour >= 12 ? 'PM' : 'AM';
    const displayHour = this.date.hour % 12 === 0 ? 12 : this.date.hour % 12;
    const displayMin = this.date.minute < 10 ? `0${this.date.minute}` : `${this.date.minute}`;
    const timeString = `${displayHour}:${displayMin} ${period}`;

    const phaseNames: Record<TimeOfDay, string> = {
      dawn: 'Curzon Dawn',
      morning: 'Dhaka Morning',
      afternoon: 'Curzon Afternoon',
      sunset: 'Golden Twilight',
      night: 'Dhaka Starlight Night',
      midnight: 'Mystic Midnight'
    };

    const phaseString = phaseNames[this.date.timePhase] || 'Curzon Afternoon';
    return { timeString, phaseString };
  }

  getTimeScale(): number {
    return this.timeScale;
  }

  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale);
  }

  isPaused(): boolean {
    return this.paused;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  update(deltaMs: number, overrideTimeScale?: number): void {
    if (this.paused) return;

    const activeScale = overrideTimeScale !== undefined ? overrideTimeScale : this.timeScale;
    // 1 real second = 1 game minute by default (configurable via timeScale)
    this.minuteTickAccumulator += (deltaMs / 1000) * activeScale;

    while (this.minuteTickAccumulator >= 1.0) {
      this.minuteTickAccumulator -= 1.0;
      this.advanceMinute();
    }
  }

  advanceMinute(): void {
    const oldPhase = this.date.timePhase;
    this.date.minute++;

    let phaseChanged = false;

    if (this.date.minute >= 60) {
      this.date.minute = 0;
      this.date.hour++;
      const newPhase = this.calculateTimePhase(this.date.hour);
      if (newPhase !== oldPhase) {
        this.date.timePhase = newPhase;
        phaseChanged = true;
      }

      if (this.date.hour >= 24) {
        this.date.hour = 0;
        this.advanceDay();
      }
    }

    const currentSnapshot = this.getDate();

    // Trigger phase change listeners if phase transitioned
    if (phaseChanged) {
      this.phaseListeners.forEach(fn => fn(this.date.timePhase, oldPhase, currentSnapshot));
    }

    // Trigger minute listeners
    if (this.onMinuteCallback) {
      this.onMinuteCallback(currentSnapshot);
    }
    this.minuteListeners.forEach(fn => fn(currentSnapshot));

    // Update DOM UI if present
    const ui = typeof window !== 'undefined' ? (window as any).UI : null;
    if (ui && ui.updateClock) {
      const { timeString, phaseString } = this.getFormattedTime();
      ui.updateClock(timeString, phaseString);
    }
  }

  advanceDay(): void {
    this.date.day++;
    if (this.date.day > 28) {
      this.date.day = 1;
      this.advanceSeason();
    }

    const currentSnapshot = this.getDate();
    if (this.onDayCallback) {
      this.onDayCallback(currentSnapshot);
    }
    this.dayListeners.forEach(fn => fn(this.date.day, currentSnapshot));
  }

  advanceSeason(): void {
    const cycle: Season[] = ['spring', 'summer', 'monsoon', 'autumn', 'winter'];
    const idx = cycle.indexOf(this.date.season);
    if (idx === cycle.length - 1) {
      this.date.season = cycle[0];
      this.date.year++;
    } else {
      this.date.season = cycle[idx + 1];
    }

    if (this.onSeasonCallback) {
      this.onSeasonCallback(this.date.season, this.date.year);
    }
    this.seasonListeners.forEach(fn => fn(this.date.season, this.date.year));
  }

  setWeather(weather: WeatherType): void {
    if (this.date.weather === weather) return;
    this.date.weather = weather;
    const currentSnapshot = this.getDate();
    this.weatherListeners.forEach(fn => fn(weather, currentSnapshot));
  }

  jumpToTime(hour: number, minute = 0): void {
    const oldPhase = this.date.timePhase;
    this.date.hour = Math.max(0, Math.min(23, Math.floor(hour)));
    this.date.minute = Math.max(0, Math.min(59, Math.floor(minute)));
    this.date.timePhase = this.calculateTimePhase(this.date.hour);

    const currentSnapshot = this.getDate();
    if (this.date.timePhase !== oldPhase) {
      this.phaseListeners.forEach(fn => fn(this.date.timePhase, oldPhase, currentSnapshot));
    }
    this.minuteListeners.forEach(fn => fn(currentSnapshot));

    const ui = typeof window !== 'undefined' ? (window as any).UI : null;
    if (ui && ui.updateClock) {
      const { timeString, phaseString } = this.getFormattedTime();
      ui.updateClock(timeString, phaseString);
    }
  }

  // Multi-subscriber methods with unsubscribe handles
  subscribeMinute(callback: MinuteCallback): () => void {
    this.minuteListeners.push(callback);
    return () => {
      this.minuteListeners = this.minuteListeners.filter(fn => fn !== callback);
    };
  }

  subscribePhase(callback: PhaseCallback): () => void {
    this.phaseListeners.push(callback);
    return () => {
      this.phaseListeners = this.phaseListeners.filter(fn => fn !== callback);
    };
  }

  subscribeDay(callback: DayCallback): () => void {
    this.dayListeners.push(callback);
    return () => {
      this.dayListeners = this.dayListeners.filter(fn => fn !== callback);
    };
  }

  subscribeSeason(callback: SeasonCallback): () => void {
    this.seasonListeners.push(callback);
    return () => {
      this.seasonListeners = this.seasonListeners.filter(fn => fn !== callback);
    };
  }

  subscribeWeather(callback: WeatherCallback): () => void {
    this.weatherListeners.push(callback);
    return () => {
      this.weatherListeners = this.weatherListeners.filter(fn => fn !== callback);
    };
  }

  // Legacy single callback setters (preserved for backward compatibility)
  onMinute(callback: MinuteCallback): void {
    this.onMinuteCallback = callback;
    this.subscribeMinute(callback);
  }

  onDay(callback: (date: CalendarDate) => void): void {
    this.onDayCallback = callback;
    this.subscribeDay((_, date) => callback(date));
  }
}

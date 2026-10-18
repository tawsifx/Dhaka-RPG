// src/systems/TimeCalendarSystem.ts - Clock, day phases, weather state, & 28-day 4-season calendar hooks
import { CalendarDate, Season, TimeOfDay, WeatherType } from '../types/stardew.types';

export class TimeCalendarSystem {
  private date: CalendarDate;
  private minuteTickAccumulator = 0;
  private onMinuteCallback?: (date: CalendarDate) => void;
  private onDayCallback?: (date: CalendarDate) => void;
  private onSeasonCallback?: (season: Season, year: number) => void;

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

  update(deltaMs: number, timeScale = 1.0): void {
    // 1 real second = 1 game minute by default (configurable)
    this.minuteTickAccumulator += (deltaMs / 1000) * timeScale;

    while (this.minuteTickAccumulator >= 1.0) {
      this.minuteTickAccumulator -= 1.0;
      this.advanceMinute();
    }
  }

  advanceMinute(): void {
    this.date.minute++;
    if (this.date.minute >= 60) {
      this.date.minute = 0;
      this.date.hour++;
      this.date.timePhase = this.calculateTimePhase(this.date.hour);

      if (this.date.hour >= 24) {
        this.date.hour = 0;
        this.advanceDay();
      }
    }

    if (this.onMinuteCallback) {
      this.onMinuteCallback(this.getDate());
    }

    // Update DOM UI if present
    const ui = (window as any).UI;
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

    if (this.onDayCallback) {
      this.onDayCallback(this.getDate());
    }
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
  }

  setWeather(weather: WeatherType): void {
    this.date.weather = weather;
  }

  onMinute(callback: (date: CalendarDate) => void): void {
    this.onMinuteCallback = callback;
  }

  onDay(callback: (date: CalendarDate) => void): void {
    this.onDayCallback = callback;
  }
}

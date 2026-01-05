import { ClockPort } from './clock.port';
export declare class SystemClock implements ClockPort {
    now(): Date;
    isoNow(): string;
    timestamp(): number;
}

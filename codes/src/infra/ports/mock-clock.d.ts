import { ClockPort } from './clock.port';
export declare class MockClock implements ClockPort {
    private currentTime;
    constructor(initialTime?: Date);
    now(): Date;
    isoNow(): string;
    timestamp(): number;
    setTime(time: Date): void;
    advance(milliseconds: number): void;
    reset(): void;
}

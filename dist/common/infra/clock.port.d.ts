export interface ClockPort {
    now(): Date;
    isoNow(): string;
    after(seconds: number): Date;
    isoAfter(seconds: number): string;
}
export declare class SystemClock implements ClockPort {
    now(): Date;
    isoNow(): string;
    after(seconds: number): Date;
    isoAfter(seconds: number): string;
}
export declare class MockClock implements ClockPort {
    private currentTime;
    constructor(fixedTime?: Date | string);
    now(): Date;
    isoNow(): string;
    after(seconds: number): Date;
    isoAfter(seconds: number): string;
    setTime(time: Date | string): void;
    advance(seconds: number): void;
}
export declare const CLOCK_PORT: unique symbol;

export interface ClockPort {
    now(): Date;
    isoNow(): string;
    timestamp(): number;
}
export declare const CLOCK_PORT: unique symbol;

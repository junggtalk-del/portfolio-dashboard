export type EmaCrossoverSignal = "BUY" | "SELL" | "HOLD" | "INSUFFICIENT_DATA";
export type EmaTrend = "BULLISH" | "BEARISH" | "NEUTRAL" | "UNKNOWN";
export type CloseSmaSignal =
  | "BULLISH_BREAKOUT"
  | "BEARISH_BREAKDOWN"
  | "HOLD"
  | "INSUFFICIENT_DATA";
export type Sma200Status = "ABOVE_SMA200" | "BELOW_SMA200" | "AT_SMA200" | "UNKNOWN";

export interface EmaCrossoverInput {
  prices: number[];
  dates: string[];
  ema12: Array<number | null>;
  ema26: Array<number | null>;
}

export interface CloseSmaCrossoverInput {
  prices: number[];
  dates: string[];
  sma200: Array<number | null>;
}

export interface EmaCrossoverResult {
  signal: EmaCrossoverSignal;
  trend: EmaTrend;
  signalDate: string | null;
}

export interface CloseSmaCrossoverResult {
  signal: CloseSmaSignal;
  status: Sma200Status;
  signalDate: string | null;
}

export interface AssetTechnicalSignalInput {
  symbol: string;
  closes: number[];
  dates: string[];
}

export interface AssetTechnicalSignalResult {
  symbol: string;
  latestClose: number | null;
  latestDate: string | null;
  ema: {
    ema12: number | null;
    ema26: number | null;
    signal: EmaCrossoverSignal;
    trend: EmaTrend;
    signalDate: string | null;
    recentCrossover: {
      signal: "BUY" | "SELL";
      signalDate: string | null;
      barsAgo: number;
    } | null;
  };
  sma200: {
    sma200: number | null;
    signal: CloseSmaSignal;
    status: Sma200Status;
    signalDate: string | null;
    recentCrossover: {
      signal: "BULLISH_BREAKOUT" | "BEARISH_BREAKDOWN";
      signalDate: string | null;
      barsAgo: number;
    } | null;
  };
}

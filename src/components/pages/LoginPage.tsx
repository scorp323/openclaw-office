import { KeyRound, Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAuthToken, validatePin } from "@/lib/auth";

export function LoginPage() {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      // Only allow single digit
      const digit = value.replace(/\D/gu, "").slice(-1);
      const next = [...digits];
      next[index] = digit;
      setDigits(next);
      setError(null);

      // Auto-advance to next input
      if (digit && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all 4 digits are entered
      if (digit && index === 3 && next.every((d) => d.length === 1)) {
        void submitPin(next.join(""));
      }
    },
    [digits],
  );

  const handleKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Backspace" && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      if (event.key === "Enter") {
        const pin = digits.join("");
        if (pin.length === 4) {
          void submitPin(pin);
        }
      }
    },
    [digits],
  );

  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/gu, "").slice(0, 4);
    if (pasted.length === 4) {
      const next = pasted.split("");
      setDigits(next);
      setError(null);
      void submitPin(pasted);
    }
  }, []);

  async function submitPin(pin: string) {
    setLoading(true);
    setError(null);
    const valid = await validatePin(pin);
    setLoading(false);

    if (valid) {
      setAuthToken(pin);
      navigate("/", { replace: true });
    } else {
      setError("Invalid PIN. Please try again.");
      setDigits(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm px-6">
        <div className="flex flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(0,255,65,0.1)] text-[#00ff41]">
            <KeyRound className="h-8 w-8" />
          </div>

          <h1 className="mb-2 text-xl font-bold text-gray-100">Mission Control</h1>
          <p className="mb-8 text-sm text-gray-400">Enter your 4-digit PIN to continue</p>

          <div className="mb-6 flex gap-3" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                autoFocus={index === 0}
                disabled={loading}
                className="h-14 w-14 rounded-xl border-2 border-gray-700 bg-gray-900 text-center text-2xl font-bold text-[#00ff41] outline-none transition-colors focus:border-[#00ff41] focus:shadow-[0_0_12px_rgba(0,255,65,0.2)] disabled:opacity-50"
              />
            ))}
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying…</span>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <p className="mt-8 text-xs text-gray-600">
            Default PIN for development: 1337
          </p>
        </div>
      </div>
    </div>
  );
}

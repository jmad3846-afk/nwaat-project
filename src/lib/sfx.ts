/**
 * محرك المؤثرات الصوتية للبرنامج.
 *
 * يعتمد على Web Audio API بالكامل دون أي ملفات صوتية خارجية، فلا توجد طلبات
 * شبكة إضافية ولا أخطاء تحميل. يُنشأ AudioContext بأول نقرة فعلية لأن المتصفحات
 * تحجب الصوت قبل تفاعل المستخدم (autoplay policy).
 */

export type SfxName = "tap" | "save" | "deliver" | "error";

const STORAGE_KEY = "nwaat-sound";
const DEFAULT_ENABLED = true;

/** مستويات الصوت لكل نغمة — منخفضة عمداً ليبقى التأثير لطيفاً ومهنياً. */
const LEVELS: Record<SfxName, number> = {
  tap: 0.1,
  save: 0.14,
  deliver: 0.13,
  error: 0.1,
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readStored();

function readStored(): boolean {
  if (typeof window === "undefined") return DEFAULT_ENABLED;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === null) return DEFAULT_ENABLED;
    return v !== "0";
  } catch {
    return DEFAULT_ENABLED;
  }
}

function writeStored(value: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* التخزين غير متاح — نكتفي بالحالة في الذاكرة */
  }
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
      master = null;
      return null;
    }
  }
  // بعض المتصفحات تُبقي السياق معلّقاً حتى أول تفاعل — نستأنفه هنا.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type ToneSpec = {
  /** التردد بالهرتز */
  freq: number;
  /** بداية النغمة بالنسبة لزمن السياق */
  at: number;
  /** المدة بالثواني */
  dur: number;
  type?: OscillatorType;
  gain?: number;
  /** تردد نهاية النغمة لصنع انزلاق (glide) */
  slideTo?: number;
};

function tone(ac: AudioContext, spec: ToneSpec): void {
  if (!master) return;
  const { freq, at, dur, type = "sine", gain = 0.12, slideTo } = spec;
  const start = ac.currentTime + at;
  const osc = ac.createOscillator();
  const env = ac.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), start + dur);
  }

  // مُغلّف نغمة ناعم: صعود سريع ثم انطفاء تدريجي لتجنّب النقرة الحادة.
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.014, dur / 3));
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  osc.connect(env);
  env.connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

/** تسلسلات النغمات لكل حدث. */
const PATTERNS: Record<SfxName, (ac: AudioContext) => void> = {
  // نقرة قصيرة جداً على كل زر — لا تُلتفت إليها لكنها تؤكد الاستجابة.
  tap: (ac) =>
    tone(ac, {
      freq: 1150,
      at: 0,
      dur: 0.055,
      type: "triangle",
      gain: LEVELS.tap,
      slideTo: 640,
    }),

  // حفظ جهاز: نغمتان صاعدتان هادئتان (قرار + إتمام).
  save: (ac) => {
    tone(ac, { freq: 783.99, at: 0, dur: 0.17, type: "sine", gain: LEVELS.save });
    tone(ac, {
      freq: 1046.5,
      at: 0.11,
      dur: 0.26,
      type: "sine",
      gain: LEVELS.save,
    });
  },

  // تسليم للتجهيز: أربيج صاعد من ثلاث نغمات يوحي بانتقال الجهاز للمرحلة التالية.
  deliver: (ac) => {
    const notes = [659.25, 880, 1174.66];
    notes.forEach((freq, i) =>
      tone(ac, {
        freq,
        at: i * 0.085,
        dur: 0.22,
        type: "triangle",
        gain: LEVELS.deliver,
      }),
    );
  },

  // فشل عملية: نغمة منخفضة هابطة — غير حادة ولا مزعجة.
  error: (ac) =>
    tone(ac, {
      freq: 320,
      at: 0,
      dur: 0.26,
      type: "sine",
      gain: LEVELS.error,
      slideTo: 170,
    }),
};

export const sfx = {
  /** تشغيل نغمة باسمها. لا يفعل شيئاً إذا كان الصوت مكتوماً. */
  play(name: SfxName): void {
    if (!muted || typeof window === "undefined") return;
    const ac = ensureContext();
    if (!ac || !master) return;
    try {
      PATTERNS[name](ac);
    } catch {
      /* الصوت تحسّني — لا نسمح له بإسقاط أي عملية */
    }
  },

  /** نغمة النقر الافتراضية. */
  tap(): void {
    this.play("tap");
  },

  isEnabled(): boolean {
    return muted;
  },

  /** يعيد القيمة الجديدة بعد التبديل. */
  setEnabled(value: boolean): boolean {
    muted = value;
    writeStored(value);
    // عند إعادة التفعيل نُصدر نغمة تأكيد ليعرف المستخدم أن الصوت عاد.
    if (value) this.play("save");
    return value;
  },

  toggle(): boolean {
    return this.setEnabled(!muted);
  },
};

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * A lesson is a small, durable rule the system learned once and can recall later.
 * `cue` decides when it applies (a substring match against the prompt); `content` is
 * the text injected ahead of the prompt when it applies.
 */
export interface Lesson {
  id: string;
  cue: string;
  content: string;
  createdAt?: string;
}

/** The store an organ recalls from and learns into. */
export interface LessonStore {
  all(): Lesson[];
  /** Lessons whose cue appears in the prompt (case-insensitive). */
  recall(prompt: string): Lesson[];
  put(lesson: Lesson): void;
  save(): void;
  size(): number;
}

/** In-memory store, handy for tests that do not need disk persistence. */
export class MemoryStore implements LessonStore {
  protected lessons: Map<string, Lesson> = new Map();

  all(): Lesson[] {
    return [...this.lessons.values()];
  }
  recall(prompt: string): Lesson[] {
    const p = prompt.toLowerCase();
    return this.all().filter((l) => l.cue && p.includes(l.cue.toLowerCase()));
  }
  put(lesson: Lesson): void {
    this.lessons.set(lesson.id, lesson);
  }
  save(): void {
    /* memory store: nothing to persist */
  }
  size(): number {
    return this.lessons.size;
  }
}

/**
 * A store persisted to a JSON file. Constructing it loads whatever is already on
 * disk, so a fresh instance in a later process recalls what an earlier process wrote.
 * That cross-process round-trip is the whole point: a prompt cannot carry a lesson
 * from one session into the next, but this can.
 */
export class JsonFileStore extends MemoryStore {
  constructor(private readonly path: string) {
    super();
    if (existsSync(path)) {
      try {
        const arr = JSON.parse(readFileSync(path, 'utf8')) as Lesson[];
        for (const l of arr) this.lessons.set(l.id, l);
      } catch {
        /* corrupt or empty file: start clean rather than throw */
      }
    }
  }

  override save(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.all(), null, 2));
  }
}

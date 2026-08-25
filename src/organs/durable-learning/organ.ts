import type { BaseModel, GenerateOptions, Organ } from '../../base/types.js';
import type { Lesson, LessonStore } from './store.js';

function lessonsBlock(lessons: Lesson[]): string {
  const rules = lessons.map((l) => `- ${l.content}`).join('\n');
  return `You have learned the following in earlier sessions. Apply it:\n${rules}`;
}

/**
 * The durable-learning organ. Wraps a base so that, on a prompt matching a stored
 * lesson's cue, the lesson is recalled from the store and injected ahead of the
 * prompt. The store persists across process boundaries (see JsonFileStore), so a
 * lesson learned in one session changes behavior in a later, cold session. That is
 * the property a prompt cannot hold. When disabled, or when nothing is recalled, the
 * wrapped model is byte-identical to the base.
 */
export class DurableLearningOrgan implements Organ {
  readonly name = 'durable-learning';
  enabled: boolean;

  constructor(private readonly store: LessonStore, config: { enabled?: boolean } = {}) {
    this.enabled = config.enabled ?? true;
  }

  wrap(base: BaseModel): BaseModel {
    const organ = this;
    return {
      id: base.id,
      async generate(prompt: string, opts?: GenerateOptions): Promise<string> {
        if (!organ.enabled) return base.generate(prompt, opts);
        const lessons = organ.store.recall(prompt);
        if (lessons.length === 0) return base.generate(prompt, opts);
        return base.generate(`${lessonsBlock(lessons)}\n\n${prompt}`, opts);
      },
    };
  }

  /** Persist a lesson so a later session recalls it. */
  learn(lesson: Lesson): void {
    this.store.put(lesson);
    this.store.save();
  }

  recall(prompt: string): Lesson[] {
    return this.store.recall(prompt);
  }
}

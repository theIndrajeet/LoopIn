// Event bus for celebration system
export const celebrationEvents = new EventTarget();

export type CelebrationType = 'first_completion' | 'personal_best' | 'level_up' | 'streak_milestone';

export interface CelebrationDetail {
  type: CelebrationType;
  meta?: {
    habitTitle?: string;
    streakCount?: number;
    level?: number;
    xp?: number;
  };
}

export const celebrate = (type: CelebrationType, meta?: CelebrationDetail['meta']) => {
  celebrationEvents.dispatchEvent(
    new CustomEvent<CelebrationDetail>('celebrate', { 
      detail: { type, meta } 
    })
  );
};

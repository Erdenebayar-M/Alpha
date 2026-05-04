export type CardStatus = 'idle' | 'selected' | 'correct' | 'wrong';

export interface Choice {
  id: string;
  label: string;
  imageUrl: string;
  isCorrect: boolean;
}

export interface NavItem {
  iconUrl: string;
  label: string;
  active?: boolean;
}

export interface ProgressInfo {
  current: number;
  total: number;
}

/** Asset URLs every screen needs */
export interface BaseAssets {
  backIcon: string;
  audioIcon: string;
  checkmark: string;
  cross: string;
}

/** Minimum props every demo screen must accept (LSP contract) */
export interface BaseScreenProps {
  progress: ProgressInfo;
  stage: string;
  navItems: NavItem[];
  assets: BaseAssets;
  onComplete?: () => void;
}

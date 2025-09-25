// Friend code generation and management utilities

interface FriendCode {
  code: string;
  discount: number;
  createdBy: string;
  expiresAt: Date;
  usedBy?: string;
}

// Generate a random friend code
export const generateFriendCode = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Validate friend code format
export const isValidFriendCodeFormat = (code: string): boolean => {
  return /^[A-Z0-9]{8}$/.test(code);
};

// Calculate discount based on friend code
export const getFriendCodeDiscount = (code: string): number => {
  // Standard 25% discount for friend codes
  return 25; // percentage
};

// Friend code storage in localStorage for demo purposes
const FRIEND_CODES_KEY = 'friend_codes';

export const saveFriendCode = (code: FriendCode): void => {
  const codes = getFriendCodes();
  codes.push(code);
  localStorage.setItem(FRIEND_CODES_KEY, JSON.stringify(codes));
};

export const getFriendCodes = (): FriendCode[] => {
  const stored = localStorage.getItem(FRIEND_CODES_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const validateFriendCode = (code: string, userId: string): { valid: boolean; discount?: number; error?: string } => {
  const codes = getFriendCodes();
  const friendCode = codes.find(c => c.code === code);
  
  if (!friendCode) {
    return { valid: false, error: 'Código de amigo não encontrado' };
  }
  
  if (friendCode.expiresAt < new Date()) {
    return { valid: false, error: 'Código de amigo expirado' };
  }
  
  if (friendCode.createdBy === userId) {
    return { valid: false, error: 'Não podes usar o teu próprio código' };
  }
  
  if (friendCode.usedBy) {
    return { valid: false, error: 'Código de amigo já foi usado' };
  }
  
  return { valid: true, discount: friendCode.discount };
};

export const useFriendCode = (code: string, userId: string): boolean => {
  const codes = getFriendCodes();
  const friendCodeIndex = codes.findIndex(c => c.code === code);
  
  if (friendCodeIndex === -1) return false;
  
  codes[friendCodeIndex].usedBy = userId;
  localStorage.setItem(FRIEND_CODES_KEY, JSON.stringify(codes));
  return true;
};
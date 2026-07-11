import { mockUsers } from './mockData';
import { validateDOB } from '../utils/age';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getMockUsers = () => {
  try {
      const users = JSON.parse(localStorage.getItem('mock_db_users') || '[]');
      if (Array.isArray(users) && users.length > 0) return users;
  } catch(e) {}
  
  const defaultUsers = [
      { email: "chaiwala_sharma@gmail.com", password: "mypass123", username: "bappu_bhai", id: "user_1" },
      { email: "john@test.com", password: "hello123", username: "john", id: "user_2" },
      { email: "any@email.com", password: "any6chars", username: "any", id: "user_3" },
  ];
  localStorage.setItem('mock_db_users', JSON.stringify(defaultUsers));
  return defaultUsers;
}

const saveMockUsers = (users: any[]) => {
  localStorage.setItem('mock_db_users', JSON.stringify(users));
};

export const mockLogin = async (identifier: string, password: string) => {
  await delay(1000);
  if (!identifier) {
    throw new Error("Please enter your email or phone number");
  }
  
  const isEmail = identifier.includes('@');
  // Removing strict email checks so phone numbers can pass
  
  if (!password) {
    throw new Error("Please enter your password");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  if (password === identifier) {
    throw new Error("Password cannot be the same as your email/phone");
  }
  
  const users = getMockUsers();
  const user = users.find(u => (u.email === identifier || u.phone === identifier) && u.password === password);
  if (!user) {
    throw new Error("Incorrect credentials");
  }

  const authUser = {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.username,
    avatar: "https://i.pravatar.cc/150?img=1",
    dateOfBirth: user.dateOfBirth || null,
    isMinor: user.isMinor ?? null,
    location: user.location || '',
  };
  localStorage.setItem("skrimchat_user", JSON.stringify(authUser));
  return authUser;
};

export const mockSignup = async (
  email: string,
  password: string,
  username: string,
  fullName?: string,
  phone?: string,
  dateOfBirth?: string,
) => {
  await delay(1000);
  if (!email) throw new Error("Please enter your email");
  if (!email.includes('@') || !email.includes('.')) throw new Error("Please enter a valid email address");
  if (!password) throw new Error("Please enter your password");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  if (password === email) throw new Error("Password cannot be the same as your email");
  if (!username) throw new Error("Please enter a username");

  const dobCheck = validateDOB(dateOfBirth || '');
  if (!dobCheck.valid) {
    throw new Error(dobCheck.error || "Please enter a valid date of birth");
  }

  const users = getMockUsers();
  if (users.find(u => u.email === email)) {
    throw new Error("Email already registered");
  }

  const newUser = {
    email,
    password,
    username,
    fullName,
    phone,
    dateOfBirth,
    isMinor: dobCheck.isMinor,
    id: `user_${Date.now()}`,
  };
  users.push(newUser);
  saveMockUsers(users);

  const authUser = {
    id: newUser.id,
    email,
    username,
    displayName: fullName || username,
    avatar: "https://i.pravatar.cc/150?img=1",
    dateOfBirth,
    isMinor: dobCheck.isMinor,
  };
  // We don't save to skrimchat_user here, we wait for OTP!
  return authUser;
};

export const mockLogout = async () => {
  await delay(500);
  localStorage.removeItem("skrimchat_user");
  return true;
};

export const mockGoogleSignIn = async () => {
  await delay(800);
  const user = { ...mockUsers[1], email: "google.user@example.com" };
  localStorage.setItem("skrimchat_user", JSON.stringify(user));
  return user;
};

export const mockOTPSend = async (phone: string) => {
  await delay(1000);
  return { success: true, message: "OTP sent" };
};

export const mockOTPVerify = async (otp: string, pendingUser?: any) => {
  await delay(1000);
  if (otp.length === 6) {
    const userToSave = pendingUser || { ...mockUsers[2], phone: "Verified" };
    localStorage.setItem("skrimchat_user", JSON.stringify(userToSave));
    return userToSave;
  }
  throw new Error("Please enter complete 6-digit code");
};

// ---------------------------------------------------------------------------
// Personal Details (Settings) helpers
// ---------------------------------------------------------------------------

const USERNAME_COOLDOWN_DAYS = 30;

export const mockCheckUsernameAvailable = async (username: string, currentUserId: string) => {
  await delay(400);
  const clean = username.replace(/^@/, '').trim();
  if (!clean || clean.length < 3) return { available: false, reason: "Username must be at least 3 characters" };
  if (clean.includes(' ')) return { available: false, reason: "Username cannot contain spaces" };
  if (!/^[a-zA-Z0-9_]+$/.test(clean)) return { available: false, reason: "Only letters, numbers, and _ allowed" };

  const users = getMockUsers();
  const taken = users.find((u: any) => u.id !== currentUserId && (u.username === clean || u.username === '@' + clean));
  if (taken) return { available: false, reason: "Username is already taken" };
  return { available: true };
};

export const mockCanChangeUsername = (lastChangedAt?: number | null) => {
  if (!lastChangedAt) return { allowed: true, daysLeft: 0 };
  const elapsedDays = (Date.now() - lastChangedAt) / (1000 * 60 * 60 * 24);
  if (elapsedDays >= USERNAME_COOLDOWN_DAYS) return { allowed: true, daysLeft: 0 };
  return { allowed: false, daysLeft: Math.ceil(USERNAME_COOLDOWN_DAYS - elapsedDays) };
};

// Email changes require re-verification via a (mock) OTP sent to the new address.
export const mockSendEmailChangeOTP = async (newEmail: string) => {
  await delay(800);
  if (!newEmail.includes('@') || !newEmail.includes('.')) {
    throw new Error("Please enter a valid email address");
  }
  const users = getMockUsers();
  if (users.find((u: any) => u.email === newEmail)) {
    throw new Error("That email is already in use");
  }
  return { success: true, message: `Verification code sent to ${newEmail}` };
};

export const mockVerifyEmailChangeOTP = async (otp: string) => {
  await delay(600);
  if (otp.length === 6) return { success: true };
  throw new Error("Please enter the complete 6-digit code");
};

export const mockUpdatePersonalDetails = async (
  userId: string,
  updates: { name?: string; username?: string; email?: string; dateOfBirth?: string; location?: string },
) => {
  await delay(700);

  if (updates.dateOfBirth) {
    const dobCheck = validateDOB(updates.dateOfBirth);
    if (!dobCheck.valid) throw new Error(dobCheck.error || "Please enter a valid date of birth");
  }

  const users = getMockUsers();
  const idx = users.findIndex((u: any) => u.id === userId);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updates };
    saveMockUsers(users);
  }

  const currentRaw = localStorage.getItem('skrimchat_user');
  const current = currentRaw ? JSON.parse(currentRaw) : {};
  const merged = { ...current, ...updates, displayName: updates.name || current.displayName };
  localStorage.setItem('skrimchat_user', JSON.stringify(merged));
  window.dispatchEvent(new Event('skrimchat_user_updated'));
  return merged;
};

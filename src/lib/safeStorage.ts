class SafeStorage {
  private memoryStore: Record<string, string> = {};
  private isSupported: boolean;

  constructor(private type: 'localStorage' | 'sessionStorage') {
    try {
      const storage = window[this.type];
      const x = '__storage_test__';
      storage.setItem(x, x);
      storage.removeItem(x);
      this.isSupported = true;
    } catch (e) {
      this.isSupported = false;
    }
  }

  getItem(key: string): string | null {
    if (this.isSupported) {
      try {
        return window[this.type].getItem(key);
      } catch (e) {
        return this.memoryStore[key] || null;
      }
    }
    return this.memoryStore[key] || null;
  }

  setItem(key: string, value: string): void {
    if (this.isSupported) {
      try {
        window[this.type].setItem(key, value);
        return;
      } catch (e) {
        // Fallback to memory
      }
    }
    this.memoryStore[key] = value;
  }

  removeItem(key: string): void {
    if (this.isSupported) {
      try {
        window[this.type].removeItem(key);
        return;
      } catch (e) {
        // Fallback to memory
      }
    }
    delete this.memoryStore[key];
  }

  clear(): void {
    if (this.isSupported) {
      try {
        window[this.type].clear();
        return;
      } catch (e) {
        // Fallback to memory
      }
    }
    this.memoryStore = {};
  }
}

export const safeLocalStorage = new SafeStorage('localStorage');
export const safeSessionStorage = new SafeStorage('sessionStorage');

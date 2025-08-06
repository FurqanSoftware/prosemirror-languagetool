export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false,
): ((...args: Parameters<T>) => void) => {
  let lastArgs: IArguments | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any) {
    lastArgs = arguments;
    const later = () => {
      timeout = null;
      if (!immediate) {
        func.apply(this, lastArgs as IArguments);
      }
    };
    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);

    if (callNow) {
      func.apply(this, lastArgs as IArguments);
    }
  };
};

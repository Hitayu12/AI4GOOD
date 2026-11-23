import '@testing-library/jest-dom';

// jsdom intentionally omits layout scrolling. Defining it here keeps
// navigation behavior testable without noisy "not implemented" warnings.
Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true });
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => null,
  writable: true,
});

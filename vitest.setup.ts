import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// jsdom ne fournit pas IntersectionObserver ; utilisé par les composants
// avec animation au scroll (ex. components/marketing/Reveal.tsx).
class IntersectionObserverStub implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

// jsdom ne fournit pas scrollIntoView ; utilisé par les composants qui
// font défiler automatiquement vers un ancrage (ex. ConversationEly).
Element.prototype.scrollIntoView = vi.fn();

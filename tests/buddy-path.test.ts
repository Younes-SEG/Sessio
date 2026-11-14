import { describe, expect, it } from 'vitest';
import { buddyBounds, cursorEdge, edgeDelta, edgeLength, edgePoint } from '../src/lib/buddy-path';

describe('study buddy edge movement', () => {
  const bounds = buddyBounds(1000, 700, 60);
  it('stays on a viewport edge and fully within view throughout a lap', () => {
    const length = edgeLength(bounds);
    for (let distance = -length; distance <= length * 2; distance += 13) {
      const { x, y } = edgePoint(distance, bounds);
      expect(x).toBeGreaterThanOrEqual(42);
      expect(x).toBeLessThanOrEqual(958);
      expect(y).toBeGreaterThanOrEqual(42);
      expect(y).toBeLessThanOrEqual(658);
      expect(x === 42 || x === 958 || y === 42 || y === 658).toBe(true);
    }
  });
  it('follows the nearest edge instead of crossing the content', () => {
    expect(edgePoint(cursorEdge(500, 690, bounds), bounds)).toEqual({ x: 500, y: 658 });
    expect(edgePoint(cursorEdge(990, 200, bounds), bounds)).toEqual({ x: 958, y: 200 });
    expect(edgePoint(cursorEdge(500, 10, bounds), bounds)).toEqual({ x: 500, y: 42 });
    expect(edgePoint(cursorEdge(5, 200, bounds), bounds)).toEqual({ x: 42, y: 200 });
  });
  it('never walks over a visible sidebar', () => {
    const withSidebar = buddyBounds(1000, 700, 60, 208);
    const length = edgeLength(withSidebar);
    for (let distance = 0; distance <= length; distance += 11) {
      const { x } = edgePoint(distance, withSidebar);
      // Half the 60px buddy (30) plus its margin stays right of the 208px sidebar.
      expect(x).toBeGreaterThanOrEqual(208 + 42);
      expect(x).toBeLessThanOrEqual(958);
    }
  });
  it('takes the short path across the perimeter seam', () => {
    expect(edgeDelta(5, 995, 1000)).toBe(-10);
    expect(edgeDelta(995, 5, 1000)).toBe(10);
  });
  it('fits a phone viewport', () => {
    const phone = buddyBounds(390, 844, 48);
    expect(edgePoint(phone.width, phone)).toEqual({ x: 354, y: 808 });
  });
});

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import useScript from './index'; // Assuming default export

const SCRIPT_ID = 'test-script-id';

interface TestComponentProps {
  src: string;
  onReady: () => void;
  onError: (e: Event | string) => void;
  otherProps: any; // Allow any for test flexibility with current THTMLScriptElementProps
  startTrigger?: boolean;
  appendTo?: string;
}

const TestComponent: React.FC<TestComponentProps> = ({
  src,
  onReady,
  onError,
  otherProps,
  startTrigger = true,
  appendTo = 'head',
}) => {
  const { ready, error } = useScript({
    src,
    onReady,
    onError,
    otherProps,
    id: SCRIPT_ID,
    startTrigger,
    appendTo,
  });

  // Optional: Track renders to give a hint if something is wrong, though timeout is the main guard
  const renderCountRef = React.useRef(0);
  renderCountRef.current += 1;

  return (
    <div>
      <div data-testid="render-count">{renderCountRef.current}</div>
      {ready && <div data-testid="script-ready">Script Ready</div>}
      {error && <div data-testid="script-error">Error loading script</div>}
    </div>
  );
};

describe('useScript Hook', () => {
  beforeEach(() => {
    // Clean up any scripts added by previous tests
    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      existingScript.remove();
    }
    // Reset spies or mocks if any were used
    jest.clearAllMocks();
  });

  test('should not cause infinite loop with unstable props and add script only once', async () => {
    const mockOnReady = jest.fn();
    const mockOnError = jest.fn();
    const scriptSrc = 'https://example.com/test-script.js'; // Dummy URL, won't actually load

    // Spy on appendChild to count calls
    const originalAppendChild = document.head.appendChild;
    const appendChildSpy = jest.spyOn(document.head, 'appendChild').mockImplementation(((node: Node) => {
      // Call the original appendChild to actually add the script to the DOM
      const appendedNode = originalAppendChild.call(document.head, node);
      // Simulate script load for this test if it's our script
      if (node.nodeName === 'SCRIPT' && (node as HTMLScriptElement).src === scriptSrc) {
        setTimeout(() => {
          const event = new Event('load');
          node.dispatchEvent(event);
        }, 100); // Short delay to simulate async loading
      }
      return appendedNode;
    }) as jest.Mock);

    render(
      <TestComponent
        src={scriptSrc}
        onReady={() => mockOnReady()} // Inline function
        onError={(e) => mockOnError(e)} // Inline function
        otherProps={{ 'data-test': 'test-value' } as any} // Inline object, cast to any
        appendTo="head"
      />
    );

    // Wait for the script to be considered "ready" by the hook
    // This also implicitly tests that the component doesn't hang/timeout
    await waitFor(() => expect(mockOnReady).toHaveBeenCalledTimes(1), { timeout: 2000 });

    // Check if the script element was added
    const scriptElement = document.getElementById(SCRIPT_ID);
    expect(scriptElement).not.toBeNull();
    expect(scriptElement?.tagName).toBe('SCRIPT');
    expect((scriptElement as HTMLScriptElement).src).toBe(scriptSrc);
    expect(scriptElement?.getAttribute('data-test')).toBe('test-value');

    // Assert that appendChild was called exactly once for our script
    // This is the core check for the "added only once" requirement.
    expect(appendChildSpy).toHaveBeenCalledTimes(1);

    // Verify that the script with the specific ID exists only once.
    const scripts = Array.from(document.querySelectorAll(`#${SCRIPT_ID}`));
    expect(scripts.length).toBe(1);

    // Check that onError was not called
    expect(mockOnError).not.toHaveBeenCalled();

    // Optional: Check render count if it's helpful, though this is a rough check
    // For example, expect it to be less than a certain threshold.
    // const renderCountElement = screen.getByTestId('render-count');
    // expect(parseInt(renderCountElement.textContent || "0", 10)).toBeLessThan(5); // Adjust threshold as needed

    appendChildSpy.mockRestore();
  });

  test('should call onError for a failing script and add script only once', async () => {
    const mockOnReady = jest.fn();
    const mockOnError = jest.fn();
    const scriptSrc = 'https://example.com/nonexistent-script.js';

    const originalAppendChild = document.head.appendChild;
    const appendChildSpy = jest.spyOn(document.head, 'appendChild').mockImplementation(((node: Node) => {
      const appendedNode = originalAppendChild.call(document.head, node);
      if (node.nodeName === 'SCRIPT' && (node as HTMLScriptElement).src === scriptSrc) {
        setTimeout(() => {
          const event = new Event('error');
          node.dispatchEvent(event);
        }, 100);
      }
      return appendedNode;
    }) as jest.Mock);

    render(
      <TestComponent
        src={scriptSrc}
        onReady={() => mockOnReady()}
        onError={(e) => mockOnError(e)}
        otherProps={{ 'data-another': 'value' } as any} // Cast to any
        appendTo="head"
      />
    );

    await waitFor(() => expect(mockOnError).toHaveBeenCalledTimes(1), { timeout: 2000 });

    const scriptElement = document.getElementById(SCRIPT_ID);
    expect(scriptElement).not.toBeNull();
    expect(appendChildSpy).toHaveBeenCalledTimes(1);

    const scripts = Array.from(document.querySelectorAll(`#${SCRIPT_ID}`));
    expect(scripts.length).toBe(1);

    expect(mockOnReady).not.toHaveBeenCalled();

    appendChildSpy.mockRestore();
  });
});

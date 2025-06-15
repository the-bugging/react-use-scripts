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
  appendTo?: 'head' | 'body';
  innerText?: string;
  delay?: number;
}

const TestComponent: React.FC<TestComponentProps> = ({
  src,
  onReady,
  onError,
  otherProps,
  startTrigger = true,
  appendTo = 'head',
  innerText,
  delay,
}) => {
  const { ready, error } = useScript({
    src,
    onReady,
    onError,
    otherProps,
    id: SCRIPT_ID,
    startTrigger,
    appendTo,
    innerText,
    delay,
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

  test('should handle inline script via innerText and call onReady immediately', async () => {
    const mockOnReady = jest.fn();
    const mockOnError = jest.fn();
    const innerText = 'window.inlineScriptLoaded = true;';

    render(
      <TestComponent
        src={''}
        onReady={mockOnReady}
        onError={mockOnError}
        otherProps={{ 'data-inline': 'yes' } as any}
        appendTo="head"
        startTrigger={true}
        // @ts-ignore
        innerText={innerText}
      />
    );

    // onReady should be called immediately for inline scripts
    await waitFor(() => expect(mockOnReady).toHaveBeenCalledTimes(1));
    const scriptElement = document.getElementById(SCRIPT_ID);
    expect(scriptElement).not.toBeNull();
    expect(scriptElement?.innerText).toBe(innerText);
    expect(scriptElement?.getAttribute('data-inline')).toBe('yes');
    expect(mockOnError).not.toHaveBeenCalled();
  });

  test('should delay script append by the delay prop', async () => {
    const mockOnReady = jest.fn();
    const mockOnError = jest.fn();
    const scriptSrc = 'https://example.com/delayed-script.js';
    const delay = 300;
    const originalAppendChild = document.head.appendChild;
    const appendChildSpy = jest.spyOn(document.head, 'appendChild').mockImplementation(((node: Node) => {
      const appendedNode = originalAppendChild.call(document.head, node);
      setTimeout(() => {
        const event = new Event('load');
        node.dispatchEvent(event);
      }, 50);
      return appendedNode;
    }) as jest.Mock);

    const start = Date.now();
    render(
      <TestComponent
        src={scriptSrc}
        onReady={mockOnReady}
        onError={mockOnError}
        otherProps={{}}
        appendTo="head"
        startTrigger={true}
        // @ts-ignore
        delay={delay}
      />
    );
    await waitFor(() => expect(mockOnReady).toHaveBeenCalledTimes(1), { timeout: 2000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(delay);
    appendChildSpy.mockRestore();
  });

  test('should not append script if startTrigger is false, and append when set to true', async () => {
    const mockOnReady = jest.fn();
    const mockOnError = jest.fn();
    const scriptSrc = 'https://example.com/triggered-script.js';
    const originalAppendChild = document.head.appendChild;
    const appendChildSpy = jest.spyOn(document.head, 'appendChild').mockImplementation(((node: Node) => {
      const appendedNode = originalAppendChild.call(document.head, node);
      return appendedNode;
    }) as jest.Mock);
    const { rerender } = render(
      <TestComponent
        src={scriptSrc}
        onReady={mockOnReady}
        onError={mockOnError}
        otherProps={{}}
        appendTo="head"
        startTrigger={false}
      />
    );
    expect(document.getElementById(SCRIPT_ID)).toBeNull();
    rerender(
      <TestComponent
        src={scriptSrc}
        onReady={mockOnReady}
        onError={mockOnError}
        otherProps={{}}
        appendTo="head"
        startTrigger={true}
      />
    );
    // Wait for the script to appear, then dispatch load event
    await waitFor(() => {
      const script = document.getElementById(SCRIPT_ID);
      if (script) {
        const event = new Event('load');
        script.dispatchEvent(event);
      }
      expect(document.getElementById(SCRIPT_ID)).not.toBeNull();
    });
    await waitFor(() => expect(mockOnReady).toHaveBeenCalledTimes(1), { timeout: 2000 });
    appendChildSpy.mockRestore();
  });

  test('should append script to body when appendTo is body', async () => {
    const mockOnReady = jest.fn();
    const mockOnError = jest.fn();
    const scriptSrc = 'https://example.com/body-script.js';
    const originalAppendChild = document.body.appendChild;
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(((node: Node) => {
      const appendedNode = originalAppendChild.call(document.body, node);
      setTimeout(() => {
        const event = new Event('load');
        node.dispatchEvent(event);
      }, 50);
      return appendedNode;
    }) as jest.Mock);

    render(
      <TestComponent
        src={scriptSrc}
        onReady={mockOnReady}
        onError={mockOnError}
        otherProps={{}}
        appendTo="body"
      />
    );
    await waitFor(() => expect(mockOnReady).toHaveBeenCalledTimes(1), { timeout: 2000 });
    const scriptElement = document.getElementById(SCRIPT_ID);
    expect(scriptElement).not.toBeNull();
    expect(document.body.contains(scriptElement)).toBe(true);
    appendChildSpy.mockRestore();
  });

  test('should call onError if inline script throws', async () => {
    const mockOnReady = jest.fn();
    const mockOnError = jest.fn();
    // Simulate error by throwing in handleOnLoad
    const innerText = 'throw new Error("fail inline");';
    // Patch global document.createElement to throw
    const originalCreateElement = document.createElement;
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'script') {
        throw new Error('fail inline');
      }
      // @ts-ignore
      return originalCreateElement.call(document, tag);
    });
    render(
      <TestComponent
        src={''}
        onReady={mockOnReady}
        onError={mockOnError}
        otherProps={{}}
        appendTo="head"
        // @ts-ignore
        innerText={innerText}
      />
    );
    await waitFor(() => expect(mockOnError).toHaveBeenCalled(), { timeout: 2000 });
    jest.spyOn(document, 'createElement').mockRestore();
  });

  test('ScriptLoader renders children on ready and fallback on error', async () => {
    const { ScriptLoader } = require('./index');
    const mockOnReady = jest.fn();
    const mockOnError = jest.fn();
    const scriptSrc = 'https://example.com/loader-script.js';
    const originalAppendChild = document.head.appendChild;
    let lastScript: Node | null = null;
    const appendChildSpy = jest.spyOn(document.head, 'appendChild').mockImplementation(((node: Node) => {
      lastScript = node;
      const appendedNode = originalAppendChild.call(document.head, node);
      return appendedNode;
    }) as jest.Mock);
    const { findByText, rerender } = render(
      <ScriptLoader
        src={scriptSrc}
        onReady={mockOnReady}
        onError={mockOnError}
        otherProps={{}}
        appendTo="head"
        fallback={() => <div>Fallback</div>}
      >
        <div>Loaded!</div>
      </ScriptLoader>
    );
    // Wait for the script to appear, then dispatch load event
    await waitFor(() => {
      const script = document.getElementById('react-use-script-' + new Date().toISOString());
      const anyScript = document.querySelector('script');
      if (anyScript) {
        const event = new Event('load');
        anyScript.dispatchEvent(event);
      }
      expect(document.querySelector('script')).not.toBeNull();
    });
    await findByText('Loaded!');
    expect(mockOnReady).toHaveBeenCalled();
    // Now rerender with error
    appendChildSpy.mockImplementationOnce(((node: Node) => {
      lastScript = node;
      const appendedNode = originalAppendChild.call(document.head, node);
      return appendedNode;
    }) as jest.Mock);
    rerender(
      <ScriptLoader
        src={scriptSrc + '?fail'}
        onReady={mockOnReady}
        onError={mockOnError}
        otherProps={{}}
        appendTo="head"
        fallback={() => <div>Fallback</div>}
      >
        <div>Loaded!</div>
      </ScriptLoader>
    );
    // Wait for the script to appear, then dispatch error event
    await waitFor(() => {
      const anyScript = document.querySelector('script');
      if (anyScript) {
        const event = new Event('error');
        anyScript.dispatchEvent(event);
      }
      expect(document.querySelector('script')).not.toBeNull();
    });
    await waitFor(() => expect(mockOnError).toHaveBeenCalled(), { timeout: 2000 });
    await findByText('Fallback');
    appendChildSpy.mockRestore();
  });
});

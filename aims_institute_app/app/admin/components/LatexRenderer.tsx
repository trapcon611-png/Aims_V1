'use client';
import React, { useEffect, useState, useRef } from 'react';

// Declare globals
declare global {
  interface Window {
    katex: any;
    scriptLoadingPromises: { [key: string]: Promise<void> | undefined } | undefined;
  }
}

export const LatexRenderer = ({ content }: { content: string }) => {
  const [renderedContent, setRenderedContent] = useState(content);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!content) return;

    // Initialize global promise map
    if (!window.scriptLoadingPromises) {
      window.scriptLoadingPromises = {};
    }

    const KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    const KATEX_JS = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    // ADDED: MHCHEM extension for chemistry equations (\ce{...})
    const MHCHEM_JS = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/mhchem.min.js";

    // 1. Inject CSS
    if (!document.getElementById('katex-css')) {
      const link = document.createElement("link");
      link.id = 'katex-css';
      link.href = KATEX_CSS;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }

    // 2. Load Script Helper
    const loadScript = (src: string, id: string): Promise<void> => {
      if (window.scriptLoadingPromises && window.scriptLoadingPromises[src]) {
        return window.scriptLoadingPromises[src]!;
      }

      if (document.getElementById(id) && window.katex && id === 'katex-js') {
         return Promise.resolve();
      }

      const promise = new Promise<void>((resolve, reject) => {
        if (document.getElementById(id)) {
            // Script tag exists but maybe global isn't ready, verify in init
            return resolve();
        }
        const script = document.createElement("script");
        script.id = id;
        script.src = src;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve();
        script.onerror = () => {
            if (window.scriptLoadingPromises) delete window.scriptLoadingPromises[src];
            reject(new Error(`Failed to load ${src}`));
        };
        document.head.appendChild(script);
      });

      if (window.scriptLoadingPromises) {
        window.scriptLoadingPromises[src] = promise;
      }
      return promise;
    };

    // 3. Manual Text Processor
    const processLaTeX = (text: string) => {
        if (!window.katex) return text;

        let safeText = text;

        // Regex to match delimiters: $$...$$, \[...\], \(...\), $...$
        // We handle escape sequences by looking for delimiters
        const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<!\\)\$[\s\S]+?(?<!\\)\$)/g;

        // SMART FIX: If options are 100% math/chemistry but have NO delimiters (e.g., "\ce{H2O}" or "\sqrt{gR}")
        // We will automatically wrap the entire string in inline math delimiters so it renders.
        if (!regex.test(safeText) && (safeText.includes('\\ce{') || safeText.includes('\\sqrt') || safeText.includes('^') || safeText.includes('\\frac'))) {
            safeText = `\\(${safeText}\\)`;
        }

        return safeText.replace(regex, (match) => {
            let math = match;
            let displayMode = false;

            if (match.startsWith('$$')) {
                math = match.slice(2, -2);
                displayMode = true;
            } else if (match.startsWith('\\[')) {
                math = match.slice(2, -2);
                displayMode = true;
            } else if (match.startsWith('\\(')) {
                math = match.slice(2, -2);
                displayMode = false;
            } else if (match.startsWith('$')) {
                math = match.slice(1, -1);
                displayMode = false;
            }

            try {
                return window.katex.renderToString(math, {
                    displayMode: displayMode,
                    throwOnError: false,
                    errorColor: '#cc0000',
                    strict: false
                });
            } catch (e) {
                console.error("KaTeX parse error", e);
                return match;
            }
        });
    };

    const init = async () => {
        try {
            // Load Core KaTeX
            await loadScript(KATEX_JS, 'katex-js');
            
            // Poll for global katex object
            await new Promise<void>(resolve => {
                const check = setInterval(() => {
                    if (window.katex && window.katex.renderToString) {
                        clearInterval(check);
                        resolve();
                    }
                }, 50);
                setTimeout(() => clearInterval(check), 5000);
            });

            // Load Chemistry Extension (mhchem) NOW that katex is ready
            await loadScript(MHCHEM_JS, 'katex-mhchem-js');

            // Give mhchem a tiny fraction of a second to register itself, then render
            setTimeout(() => {
                if (isMounted.current && window.katex) {
                    setRenderedContent(processLaTeX(content));
                }
            }, 50);

        } catch (e) {
            console.error("KaTeX/mhchem init failed", e);
        }
    };

    init();

  }, [content]);

  // Use dangerouslySetInnerHTML to render the processed string containing HTML
  return <span dangerouslySetInnerHTML={{__html: renderedContent}} />;
};
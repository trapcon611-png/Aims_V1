'use client';
import React, { useEffect, useRef, useState } from 'react';

// Declare globals
declare global {
  interface Window {
    katex: any;
    scriptLoadingPromises: { [key: string]: Promise<void> | undefined } | undefined;
  }
}

const AI_API_URL = 'https://prishaa-question-paper.hf.space';

const resolveImageUrl = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('http') || url.startsWith('blob') || url.startsWith('data')) return url;
    return `${AI_API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const isImageUrl = (url: string) => {
    if (!url || typeof url !== 'string') return false;
    return (url.startsWith('http') || url.startsWith('/')) && 
           (url.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp|tiff)$/i) != null || url.includes('cloudinary') || url.includes('blob') || url.includes('images'));
};

export const LatexRenderer = ({ content }: { content: string }) => {
  const [renderedContent, setRenderedContent] = useState(content);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!content) return;

    const KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    const KATEX_JS = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";

    if (!window.scriptLoadingPromises) window.scriptLoadingPromises = {};

    // Inject CSS
    if (!document.getElementById('katex-css')) {
        const link = document.createElement("link");
        link.id = 'katex-css';
        link.rel = "stylesheet";
        link.href = KATEX_CSS;
        document.head.appendChild(link);
    }

    const loadScript = (src: string, id: string): Promise<void> => {
        if (window.scriptLoadingPromises && window.scriptLoadingPromises[src]) return window.scriptLoadingPromises[src]!;
        if (document.getElementById(id) && window.katex) return Promise.resolve();

        const promise = new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.id = id;
            script.src = src;
            script.crossOrigin = "anonymous";
            script.onload = () => resolve();
            script.onerror = () => {
                if(window.scriptLoadingPromises) delete window.scriptLoadingPromises[src];
                reject();
            };
            document.head.appendChild(script);
        });
        
        if (window.scriptLoadingPromises) window.scriptLoadingPromises[src] = promise;
        return promise;
    };

    const processLaTeX = (text: string) => {
        if (!window.katex) return text;
        // Regex to find math delimiters
        const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<!\\)\$[\s\S]+?(?<!\\)\$)/g;
        return text.replace(regex, (match) => {
            let math = match;
            let displayMode = false;
            if (match.startsWith('$$')) { math = match.slice(2, -2); displayMode = true; }
            else if (match.startsWith('\\[')) { math = match.slice(2, -2); displayMode = true; }
            else if (match.startsWith('\\(')) { math = match.slice(2, -2); displayMode = false; }
            else if (match.startsWith('$')) { math = match.slice(1, -1); displayMode = false; }

            try {
                return window.katex.renderToString(math, { displayMode, throwOnError: false, errorColor: '#cc0000', strict: false });
            } catch (e) { return match; }
        });
    };

    const init = async () => {
        try {
            await loadScript(KATEX_JS, 'katex-js');
            // Poll for global
            await new Promise<void>(resolve => {
                const check = setInterval(() => {
                    if (window.katex && window.katex.renderToString) { clearInterval(check); resolve(); }
                }, 50);
                setTimeout(() => clearInterval(check), 5000);
            });

            if (isMounted.current && window.katex) {
                setRenderedContent(processLaTeX(content));
            }
        } catch (e) { console.error("KaTeX init failed", e); }
    };
    init();
  }, [content]);

  return <div dangerouslySetInnerHTML={{__html: renderedContent}} className="latex-content text-sm leading-relaxed inline"/>;
};

// Also exporting ContentRenderer here as it shares logic
export const ContentRenderer = ({ content }: { content: string }) => {
    if (!content) return null;
    if (isImageUrl(content)) {
        const src = resolveImageUrl(content);
        if(!src) return null;
        return (
            <div className="relative w-full h-20 my-1 border border-slate-100 rounded-md overflow-hidden bg-white">
                 <img src={src} alt="Content" className="w-full h-full object-contain" />
            </div>
        );
    }
    return <LatexRenderer content={content} />;
};
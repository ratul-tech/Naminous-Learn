import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeMathjax from 'rehype-mathjax/browser';
import { MathEngine } from '../types';
import React from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
  engine?: MathEngine;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className, engine = 'katex' }) => {
  const formattedContent = React.useMemo(() => {
    if (!content) return '';
    return content
      .split('$$')
      .map((part, i) => (i % 2 === 1 ? part : part.replace(/(?<!  )\n/g, '  \n')))
      .join('$$');
  }, [content]);

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[engine === 'mathjax' ? rehypeMathjax : rehypeKatex]}
      >
        {formattedContent}
      </ReactMarkdown>
    </div>
  );
};


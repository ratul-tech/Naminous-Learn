import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeMathjax from 'rehype-mathjax';
import { MathEngine } from '../types';

interface MathRendererProps {
  content: string;
  className?: string;
  engine?: MathEngine;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className, engine = 'katex' }) => {
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[engine === 'mathjax' ? rehypeMathjax : rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

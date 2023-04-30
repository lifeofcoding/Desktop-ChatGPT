import { useEffect, useState } from 'react';

const Message = ({ message }: { message: string }) => {
  const [words, setWords] = useState<string[]>([]);

  useEffect(() => {
    setWords(
      message
        .split(/\r?\n/)
        .map((line) => `${line} \n `)
        .join('')
        .split(' ')
    );
  }, [message]);

  return (
    <div>
      {words.map((word, i) => {
        return (
          <span
            key={i}
            className="fadeIn"
            // style={{ animationDelay: `${i * 0.05}s` }}
          >
            {word === '\n' ? <br /> : word}{' '}
          </span>
        );
      })}
    </div>
  );
};

export default Message;

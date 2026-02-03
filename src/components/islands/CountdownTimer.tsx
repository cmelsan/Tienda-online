import { useEffect, useState } from 'react';

interface CountdownProps {
  endTime: string;
}

export default function CountdownTimer({ endTime }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const targetDate = new Date(endTime).getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / (1000 * 60)) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ hours, minutes, seconds, isExpired: false });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (timeLeft.isExpired) {
    return (
      <div className="text-center">
        <span className="inline-block bg-red-600 text-white px-6 py-2 text-sm font-bold uppercase tracking-wider">
          Oferta Finalizada
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center justify-center text-center">
      <div className="flex flex-col items-center">
        <span className="text-4xl md:text-5xl font-black text-rose-600">
          {String(timeLeft.hours).padStart(2, '0')}
        </span>
        <span className="text-xs md:text-sm uppercase tracking-wider font-medium text-gray-600 mt-2">
          Horas
        </span>
      </div>
      
      <span className="text-3xl md:text-4xl font-black text-gray-400 px-2">:</span>
      
      <div className="flex flex-col items-center">
        <span className="text-4xl md:text-5xl font-black text-rose-600">
          {String(timeLeft.minutes).padStart(2, '0')}
        </span>
        <span className="text-xs md:text-sm uppercase tracking-wider font-medium text-gray-600 mt-2">
          Min
        </span>
      </div>
      
      <span className="text-3xl md:text-4xl font-black text-gray-400 px-2">:</span>
      
      <div className="flex flex-col items-center">
        <span className="text-4xl md:text-5xl font-black text-rose-600">
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
        <span className="text-xs md:text-sm uppercase tracking-wider font-medium text-gray-600 mt-2">
          Seg
        </span>
      </div>
    </div>
  );
}

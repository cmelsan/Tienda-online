import { useEffect, useState } from 'react';

interface CountdownProps {
  endTime: string;
  sectionId?: string;
}

export default function CountdownTimer({ endTime, sectionId }: CountdownProps) {
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

  // Hide the section after a short delay when expired
  useEffect(() => {
    if (timeLeft.isExpired && sectionId) {
      const hideTimer = setTimeout(() => {
        const section = document.getElementById(sectionId);
        if (section) {
          section.style.transition = 'opacity 0.8s ease';
          section.style.opacity = '0';
          setTimeout(() => {
            section.style.display = 'none';
          }, 800);
        }
      }, 3000); // show "Oferta Finalizada" for 3 seconds then fade out

      return () => clearTimeout(hideTimer);
    }
  }, [timeLeft.isExpired, sectionId]);

  if (timeLeft.isExpired) {
    return (
      <div className="text-center">
        <span className="inline-block bg-pink-500 text-white px-6 py-2 text-sm font-bold uppercase tracking-wider">
          Oferta Finalizada
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center justify-center text-center">
      <div className="flex flex-col items-center">
        <span className="text-4xl md:text-5xl font-black text-pink-500">
          {String(timeLeft.hours).padStart(2, '0')}
        </span>
        <span className="text-xs md:text-sm uppercase tracking-wider font-medium text-gray-600 mt-2">
          Horas
        </span>
      </div>
      
      <span className="text-3xl md:text-4xl font-black text-gray-400 px-2">:</span>
      
      <div className="flex flex-col items-center">
        <span className="text-4xl md:text-5xl font-black text-pink-500">
          {String(timeLeft.minutes).padStart(2, '0')}
        </span>
        <span className="text-xs md:text-sm uppercase tracking-wider font-medium text-gray-600 mt-2">
          Min
        </span>
      </div>
      
      <span className="text-3xl md:text-4xl font-black text-gray-400 px-2">:</span>
      
      <div className="flex flex-col items-center">
        <span className="text-4xl md:text-5xl font-black text-pink-500">
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
        <span className="text-xs md:text-sm uppercase tracking-wider font-medium text-gray-600 mt-2">
          Seg
        </span>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../services/leaderboardService';

const Leaderboard: React.FC = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchLeaderboard().then(setData);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto mt-4 bg-white border-4 border-black rounded-xl p-4">
      <h2 className="text-xl font-black mb-3">🏆 Leaderboard</h2>

      {data.map((item: any, i: number) => (
        <div key={i} className="flex justify-between py-1 font-bold">
          <span>{i + 1}. {item.name}</span>
          <span>{item.score}</span>
        </div>
      ))}
    </div>
  );
};

export default Leaderboard;

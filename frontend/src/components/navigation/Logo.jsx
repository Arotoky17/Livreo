import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ className = '' }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 group ${className}`}>
      <div className="relative flex shrink-0 items-center justify-center">
        <img
          src="/icons/livreo-scooter.webp"
          width="256"
          height="180"
          alt=""
          className="h-8 w-11 object-contain transition-transform group-hover:scale-105 motion-reduce:transition-none"
        />
      </div>

      {/* Typographie de marque */}
      <div className="flex flex-col">
        <span className="text-[22px] font-black tracking-tight text-[#0c2340] leading-none">
          Livreo
        </span>
        <span className="text-[9.5px] font-medium text-slate-400 tracking-tight leading-none mt-0.5">
          Livraison plus proche de vous
        </span>
      </div>
    </Link>
  );
}

type Props = {
  children: React.ReactNode;
};

export default function GlowBackground({
  children,
}: Props) {
  return (
    <div className="relative overflow-hidden">
      <div
        className="
          absolute
          left-1/2
          top-0
          h-[700px]
          w-[700px]
          -translate-x-1/2
          rounded-full
          bg-indigo-500/20
          blur-[180px]
        "
      />

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
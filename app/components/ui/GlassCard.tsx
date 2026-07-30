type Props = {
  children: React.ReactNode;
};

export default function GlassCard({
  children,
}: Props) {
  return (
    <div
      className="
        rounded-3xl
        border
        border-white/10
        bg-white/5
        p-6
        backdrop-blur-xl
      "
    >
      {children}
    </div>
  );
}
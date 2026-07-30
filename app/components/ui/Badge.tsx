type BadgeProps = {
  children: React.ReactNode;
};

export default function Badge({
  children,
}: BadgeProps) {
  return (
    <span
      className="
        inline-flex
        items-center
        rounded-full
        border
        border-white/10
        bg-white/5
        px-4
        py-2
        text-sm
        font-medium
        backdrop-blur-xl
      "
    >
      {children}
    </span>
  );
}
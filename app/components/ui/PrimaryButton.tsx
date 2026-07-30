type Props = {
  children: React.ReactNode;
};

export default function PrimaryButton({
  children,
}: Props) {
  return (
    <button
      className="
        rounded-xl
        px-8
        py-4
        font-semibold
        text-white

        transition-all
        duration-300

        bg-gradient-to-r
        from-indigo-600
        to-violet-600

        hover:scale-105
        hover:shadow-2xl
      "
    >
      {children}
    </button>
  );
}
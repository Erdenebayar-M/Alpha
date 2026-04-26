import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold">Хуудас олдсонгүй</h2>
      <Link className="underline" href="/">
        Нүүр хуудас руу буцах
      </Link>
    </div>
  );
}

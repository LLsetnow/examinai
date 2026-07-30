import Image from "next/image";

export function IcpFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-5 pb-7 text-center text-xs text-muted-foreground sm:px-8">
      <a className="transition-colors hover:text-primary" href="https://beian.miit.gov.cn/#/Integrated/recordQuery?keyword=%E6%B5%99ICP%E5%A4%872026031312%E5%8F%B7-1" target="_blank" rel="noreferrer">
        浙ICP备2026031312号-1
      </a>
      <span className="text-border">|</span>
      <a className="inline-flex items-center gap-1 transition-colors hover:text-primary" href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=33019202002996" target="_blank" rel="noreferrer">
        <Image src="/assets/police-record.png" alt="公安备案" width={14} height={14} />
        浙公网安备33019202002996号
      </a>
    </footer>
  );
}

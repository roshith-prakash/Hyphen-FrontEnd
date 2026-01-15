import { cn } from "@/lib/utils";
import { ReactNode } from "react";

const Table = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div className="scroller max-w-[99%] overflow-hidden overflow-x-auto">
      <table className={cn(`overflow-hidden rounded-lg ${className}`)}>
        {children}
      </table>
    </div>
  );
};

export const TableHead = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return <thead className={cn(`rounded-t-lg ${className}`)}>{children}</thead>;
};

export const TableHeader = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <th
      className={cn(
        `bg-secondarydarkbg/10 px-4 py-3 text-center font-semibold transition-all dark:bg-white/10 ${className}`,
      )}
    >
      {children}
    </th>
  );
};

export const TableBody = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return <tbody className={`${className}`}>{children}</tbody>;
};

export const TableRow = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <tr
      className={cn(
        `text-md hover:[&>*]:bg-secondarydarkbg/5 border-b-[1px] border-black/10 text-center last:border-none dark:border-white/20 dark:hover:[&>*]:bg-white/5 ${className}`,
      )}
    >
      {children}
    </tr>
  );
};

export const TableCell = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <td className={cn(`px-8 py-3 transition-all ${className}`)}>{children}</td>
  );
};

export default Table;

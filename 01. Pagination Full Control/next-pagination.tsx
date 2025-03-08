'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, useCallback } from 'react';

interface PaginationProps {
    pageSizeSelectOptions?: {
        pageSizeSearchParam?: string;
        pageSizeOptions: number[];
    };
    total: number;
    pageSize: number;
    page: number;
    pageSearchParam?: string;
    sibling?: number;
    maxVisiblePages?: number;
    showControl?: boolean;
    labelButtonPrev?: string | ReactNode;
    labelButtonNext?: string | ReactNode;
}

export default function Pagination({
    page,
    pageSize,
    total,
    pageSearchParam,
    pageSizeSelectOptions,
    showControl,
    labelButtonNext = 'Next',
    labelButtonPrev = 'Previous',
    sibling = 1,
    maxVisiblePages = 5,
}: PaginationProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Tính tổng số page dựa vào tổng phần tử / kích thước trang
    const totalPageCount = Math.ceil(total / pageSize);

    // Tạo url theo page
    const buildLink = useCallback(
        (newPage: number) => {
            const key = pageSearchParam || 'page';
            // Nếu chưa có searchParams trên url thì return 1 chuỗi searchParams
            if (!searchParams) return `${pathname}?${key}=${newPage}`;
            // Nếu đã có thì dùng web API URLSearchParams để copy và tạo chuỗi searchParams mới
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set(key, String(newPage));
            return `${pathname}?${newSearchParams.toString()}`;
        },
        [searchParams, pathname]
    );

    const navToPageSize = useCallback(
        (newPageSize: number) => {
            const key = pageSizeSelectOptions?.pageSizeSearchParam || 'pageSize';
            const newSearchParams = new URLSearchParams(searchParams || undefined);
            newSearchParams.set(key, String(newPageSize));
            newSearchParams.delete(pageSearchParam || 'page'); // Xoá current page khi thay đổi kích thước trang
            router.push(`${pathname}?${newSearchParams.toString()}`);
        },
        [searchParams, pathname]
    );

    const renderPageNumbers = (): Array<ReactNode> => {
        const items: ReactNode[] = [];

        if (totalPageCount <= maxVisiblePages) {
            for (let i = 1; i <= totalPageCount; i++) {
                items.push(
                    <div
                        key={i}
                        className={`size-8 flex justify-center items-center border rounded-sm ${
                            i === page && 'bg-gray-300'
                        }`}
                    >
                        <Link href={buildLink(i)}>{i}</Link>
                    </div>
                );
            }
        } else {
            items.push(
                <div
                    key={1}
                    className={`size-8 border flex justify-center items-center rounded-sm ${
                        page === 1 && 'bg-gray-300'
                    }`}
                >
                    <Link href={buildLink(1)}>{1}</Link>
                </div>
            );

            if (page > 3) {
                items.push(
                    <div key={'ellipsis-start'} className={`size-8 border rounded-sm flex items-center justify-center`}>
                        <span className="block">...</span>
                    </div>
                );
            }

            const start = Math.max(2, page - sibling);
            const end = Math.min(totalPageCount - 1, page + sibling);

            for (let i = start; i <= end; i++) {
                items.push(
                    <div
                        key={i}
                        className={`size-8 flex justify-center items-center border rounded-sm ${
                            i === page && 'bg-gray-300'
                        }`}
                    >
                        <Link href={buildLink(i)}>{i}</Link>
                    </div>
                );
            }

            if (page < totalPageCount - 2) {
                items.push(
                    <div key={'ellipsis-end'} className={`size-8 border rounded-sm flex justify-center items-center`}>
                        <span className="block">...</span>
                    </div>
                );
            }

            items.push(
                <div
                    key={totalPageCount}
                    className={`size-8 border flex justify-center items-center rounded-sm ${
                        page === totalPageCount && 'bg-gray-300'
                    }`}
                >
                    <Link href={buildLink(totalPageCount)}>{totalPageCount}</Link>
                </div>
            );
        }

        return items;
    };

    return (
        <div className="flex flex-col md:flex-row items-center gap-3 w-full">
            {pageSizeSelectOptions && (
                <div className="flex flex-col gap-4 flex-1">
                    <SelectRowsPerPage
                        options={pageSizeSelectOptions.pageSizeOptions}
                        setPageSize={navToPageSize}
                        pageSize={pageSize}
                    />
                </div>
            )}
            <div className="flex gap-4 items-center">
                {showControl && (
                    <Link
                        href={buildLink(Math.max(page - 1, 1))}
                        aria-disabled={page === 1}
                        tabIndex={page === 1 ? -1 : undefined}
                        className={page === 1 ? 'pointer-events-none opacity-50' : undefined}
                    >
                        {labelButtonPrev}
                    </Link>
                )}
                {renderPageNumbers()}
                {showControl && (
                    <Link
                        href={buildLink(Math.min(page + 1, totalPageCount))}
                        aria-disabled={page === totalPageCount}
                        tabIndex={page === totalPageCount ? -1 : undefined}
                        className={page === totalPageCount ? 'pointer-events-none opacity-50' : undefined}
                    >
                        {labelButtonNext}
                    </Link>
                )}
            </div>
        </div>
    );
}

function SelectRowsPerPage({
    options,
    setPageSize,
    pageSize,
}: {
    options: number[];
    setPageSize: (newSize: number) => void;
    pageSize: number;
}) {
    return (
        <div className="flex items-center gap-4">
            <span className="whitespace-nowrap text-sm">Rows per page</span>
            <select value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))}>
                {options.map((option) => (
                    <option key={option} value={String(option)}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
}

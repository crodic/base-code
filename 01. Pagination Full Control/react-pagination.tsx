import { ReactNode, useCallback } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';

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
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // Tính tổng số page dựa vào tổng phần tử / kích thước trang
    const totalPageCount = Math.ceil(total / pageSize);

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
            setSearchParams(newSearchParams.toString());
        },
        [searchParams, pathname]
    );

    const renderPageNumbers = (): Array<ReactNode> => {
        const items: ReactNode[] = [];

        if (totalPageCount <= maxVisiblePages) {
            for (let i = 1; i <= totalPageCount; i++) {
                items.push(
                    <div key={i} className={`pagination-item ${i === page && 'active'}`}>
                        <Link to={buildLink(i)}>{i}</Link>
                    </div>
                );
            }
        } else {
            items.push(
                <div key={1} className={`pagination-item ${page === 1 && 'active'}`}>
                    <Link to={buildLink(1)}>{1}</Link>
                </div>
            );

            if (page > 3) {
                items.push(
                    <div key={'ellipsis-start'} className={`pagination-item`}>
                        <span style={{ display: 'block' }}>...</span>
                    </div>
                );
            }

            const start = Math.max(2, page - sibling);
            const end = Math.min(totalPageCount - 1, page + sibling);

            for (let i = start; i <= end; i++) {
                items.push(
                    <div key={i} className={`pagination-item ${i === page && 'active'}`}>
                        <Link to={buildLink(i)}>{i}</Link>
                    </div>
                );
            }

            if (page < totalPageCount - 2) {
                items.push(
                    <div key={'ellipsis-end'} className={`pagination-item`}>
                        <span style={{ display: 'block' }}>...</span>
                    </div>
                );
            }

            items.push(
                <div key={totalPageCount} className={`pagination-item ${page === totalPageCount && 'active'}`}>
                    <Link to={buildLink(totalPageCount)}>{totalPageCount}</Link>
                </div>
            );
        }

        return items;
    };

    return (
        <div className="pagination-container">
            {pageSizeSelectOptions && (
                <div className="select-rows">
                    <SelectRowsPerPage
                        options={pageSizeSelectOptions.pageSizeOptions}
                        setPageSize={navToPageSize}
                        pageSize={pageSize}
                    />
                </div>
            )}
            <div className="pagination">
                {showControl && (
                    <Link
                        to={buildLink(Math.max(page - 1, 1))}
                        aria-disabled={page === 1}
                        tabIndex={page === 1 ? -1 : undefined}
                        className={page === 1 ? 'control-active' : undefined}
                    >
                        {labelButtonPrev}
                    </Link>
                )}
                {renderPageNumbers()}
                {showControl && (
                    <Link
                        to={buildLink(Math.min(page + 1, totalPageCount))}
                        aria-disabled={page === totalPageCount}
                        tabIndex={page === totalPageCount ? -1 : undefined}
                        className={page === totalPageCount ? 'control-active' : undefined}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>Rows per page</span>
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

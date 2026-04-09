interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onNext: () => void;
  onPrev: () => void;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  onNext,
  onPrev,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="paginationControls">
      <button className="primary narrow" onClick={onPrev} disabled={currentPage === 1}>
        Previous
      </button>
      <span className="paginationControls__label">
        Page {currentPage} of {totalPages}
      </span>
      <button className="primary narrow" onClick={onNext} disabled={currentPage === totalPages}>
        Next
      </button>
    </div>
  );
}

export default function(totalItems, currentItems, perPage, currentPage) {
    totalItems = Number(totalItems);
    currentItems = Number(currentItems);
    perPage = Number(perPage);
    currentPage = Number(currentPage);

    const paginate = {
        total_item: totalItems,
        showing: currentItems,
        first_page: 1,
        is_first_page: true,
        previous_page: (currentPage - 1) < 2 ? 1 : (currentPage - 1),
        has_previous_page: true,
        current_page: currentPage,
        next_page: currentPage + 1,
        has_next_page: true,
        last_page: Math.ceil(totalItems / perPage),
        is_last_page: false,
    };

    paginate.is_first_page = paginate.current_page === paginate.first_page;
    paginate.is_last_page = paginate.current_page === paginate.last_page;

    paginate.has_previous_page = paginate.current_page > paginate.first_page;
    paginate.has_next_page = paginate.last_page < paginate.current_page;

    return paginate;
}

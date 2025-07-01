// Prevent multiple initializations
if (!window.ProductLoadMore) {
  window.ProductLoadMore = class {
    constructor() {
      // Store instance state
      this.state = {
        isLoading: false,
        hasMoreProducts: true,
        currentPage: 1,
        loadedProducts: 0,
        totalResults: 0,
      };

      // Initialize core elements
      this.productGrid = document.getElementById('product-grid');
      this.loadMoreButton = document.querySelector('.load-more_btn');
      this.buttonText = this.loadMoreButton?.querySelector('.button-text');
      this.loadingSpinner = this.loadMoreButton?.querySelector('.load-more__spinner');

      // Bind methods
      this.handleLoadMore = this.handleLoadMore.bind(this);

      // Initialize if all required elements are present
      if (this.validateElements()) {
        this.initialize();
      }
    }

    validateElements() {
      if (!this.productGrid || !this.loadMoreButton || !this.buttonText || !this.loadingSpinner) {
        console.error('LoadMore: Required elements not found');
        return false;
      }
      return true;
    }

    initialize() {
      // Remove any existing listeners and add new one
      this.loadMoreButton.removeEventListener('click', this.handleLoadMore);
      this.loadMoreButton.addEventListener('click', this.handleLoadMore);

      // Set initial state based on data attributes
      const nextUrlElement = document.getElementById('paginateNext');
      if (nextUrlElement) {
        this.state.hasMoreProducts = !!nextUrlElement.dataset.nextUrl;
        this.productsPerPage = parseInt(nextUrlElement.dataset.productsPerPage, 10) || 24;
        this.state.totalResults = parseInt(nextUrlElement.dataset.totalResults, 10) || 0;
        this.state.loadedProducts = this.productGrid.getElementsByClassName('grid__item').length;
      }

      this.updateButtonVisibility();
    }

    resetState() {
      // Reset state when collection is updated (filters/sorting applied)
      this.state = {
        isLoading: false,
        hasMoreProducts: true,
        currentPage: 1,
        loadedProducts: 0,
        totalResults: 0,
      };
    }

    updateButtonVisibility() {
      const shouldHide =
        !this.state.hasMoreProducts ||
        (this.state.totalResults > 0 && this.state.loadedProducts >= this.state.totalResults);

      this.loadMoreButton.style.display = shouldHide ? 'none' : 'block';
    }

    setLoading(isLoading) {
      this.state.isLoading = isLoading;
      if (isLoading) {
        this.loadMoreButton.setAttribute('data-loading', '');
      } else {
        this.loadMoreButton.removeAttribute('data-loading');
      }
    }

    async getNextPageUrl() {
      const url = new URL(window.location.href);
      const currentParams = new URLSearchParams(window.location.search);

      url.searchParams.set('page', (this.state.currentPage + 1).toString());

      for (const [key, value] of currentParams.entries()) {
        if (key !== 'page') {
          url.searchParams.set(key, value);
        }
      }

      if (!url.searchParams.has('page_size')) {
        url.searchParams.set('page_size', this.productsPerPage);
      }

      return url.toString();
    }

    async fetchNextPage() {
      try {
        const url = await this.getNextPageUrl();
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Stream the response instead of loading it all at once
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let html = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          html += decoder.decode(value, { stream: true });
        }

        return html;
      } catch (error) {
        console.error('Error fetching next page:', error);
        throw error;
      }
    }

    appendNewProducts(productElements) {
      // Add a safety limit for number of products to append at once
      const MAX_PRODUCTS_PER_BATCH = this.productsPerPage || 36;
      const fragment = document.createDocumentFragment();

      // Convert to array and process in smaller batches if needed
      const products = Array.from(productElements);
      const productsToAdd = products.slice(0, MAX_PRODUCTS_PER_BATCH);

      productsToAdd.forEach((product) => {
        try {
          const clone = product.cloneNode(true);
          fragment.appendChild(clone);
        } catch (error) {
          console.error('Error cloning product:', error);
          // Continue with other products if one fails
        }
      });

      try {
        this.productGrid.appendChild(fragment);
        this.state.loadedProducts += productsToAdd.length;

        // Update hasMoreProducts based on total results and loaded products
        this.state.hasMoreProducts = this.state.loadedProducts < this.state.totalResults;

        if (products.length > MAX_PRODUCTS_PER_BATCH) {
          console.warn(
            `Product batch size limited to ${MAX_PRODUCTS_PER_BATCH}. Remaining products will be loaded in next batch.`
          );
        }
      } catch (error) {
        console.error('Error appending products:', error);
        this.state.hasMoreProducts = false;
      }
    }

    async handleLoadMore() {
      if (this.state.isLoading || !this.state.hasMoreProducts) return;

      try {
        this.setLoading(true);

        const nextPageHtml = await this.fetchNextPage();
        const parser = new DOMParser();
        const nextPageDoc = parser.parseFromString(nextPageHtml, 'text/html');

        const newProductGrid = nextPageDoc.getElementById('product-grid');
        if (!newProductGrid) throw new Error('Could not find product grid in response');

        const newProducts = newProductGrid.getElementsByClassName('grid__item');
        if (newProducts.length === 0) throw new Error('No products found in response');

        this.appendNewProducts(newProducts);
        this.state.currentPage++;

        const nextUrlElement = nextPageDoc.getElementById('paginateNext');
        console.log('Next paginate element:', nextUrlElement);
        console.log('Next URL:', nextUrlElement?.dataset.nextUrl);
        this.state.hasMoreProducts = nextUrlElement && !!nextUrlElement.dataset.nextUrl;

        this.updateButtonVisibility();

        // Dispatch event after DOM is updated
        requestAnimationFrame(() => {
          document.dispatchEvent(
            new CustomEvent('products:added', {
              detail: { productsAdded: newProducts.length },
            })
          );
        });
      } catch (error) {
        console.error('Error loading more products:', error);
        this.state.hasMoreProducts = false;
        this.updateButtonVisibility();
      } finally {
        this.setLoading(false);
      }
    }

    destroy() {
      if (this.loadMoreButton) {
        this.loadMoreButton.removeEventListener('click', this.handleLoadMore);
      }
    }
  };

  // Initialize load more functionality
  let loadMoreInstance = null;

  function initializeLoadMore() {
    if (loadMoreInstance) {
      loadMoreInstance.destroy();
    }
    loadMoreInstance = new ProductLoadMore();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLoadMore);
  } else {
    initializeLoadMore();
  }

  // Listen for products:loaded event (existing functionality)
  document.addEventListener('products:loaded', () => {
    requestAnimationFrame(() => {
      if (loadMoreInstance) {
        loadMoreInstance.destroy();
      }
      loadMoreInstance = new ProductLoadMore();
    });
  });

  // Listen for collection:updated event (new functionality for filters/sorting)
  document.addEventListener('collection:updated', () => {
    requestAnimationFrame(() => {
      if (loadMoreInstance) {
        loadMoreInstance.destroy();
      }
      loadMoreInstance = new ProductLoadMore();
      // Reset state when collection is updated due to filters/sorting
      if (loadMoreInstance) {
        loadMoreInstance.resetState();
        loadMoreInstance.initialize();
      }
    });
  });
}

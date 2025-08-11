class ProductCardCarousel {
  constructor(container) {
    this.container = container;
    this.track = container.querySelector('.product-card__carousel-track');
    this.slides = Array.from(container.querySelectorAll('.product-card__slide'));
    this.prevButton = container.closest('.product-card').querySelector('.product-card__nav-prev');
    this.nextButton = container.closest('.product-card').querySelector('.product-card__nav-next');
    this.currentIndex = 0;
    this.touchStartX = 0;
    this.touchEndX = 0;
    this.isNavigating = false;
    this.isTouchingQuickAdd = false;

    // Bind methods to this instance
    this.handlePrevClick = this.handlePrevClick.bind(this);
    this.handleNextClick = this.handleNextClick.bind(this);
    this.navigate = this.navigate.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    this.init();
  }

  init() {
    if (this.slides.length <= 1) return;

    // Add event listeners for navigation buttons
    if (this.prevButton) {
      this.prevButton.addEventListener('click', this.handlePrevClick);
    }

    if (this.nextButton) {
      this.nextButton.addEventListener('click', this.handleNextClick);
    }

    // Add touch events for mobile
    this.container.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.container.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    this.container.addEventListener('touchend', this.handleTouchEnd);

    // Ensure first slide is active
    if (!this.slides.some((slide) => slide.classList.contains('active'))) {
      this.slides[0].classList.add('active');
    }

    // Preload adjacent images
    this.preloadAdjacentImages();
  }

  handleTouchStart(e) {
    const quickAddButton = this.container.querySelector('.quick-add');
    if (quickAddButton && (e.target === quickAddButton || quickAddButton.contains(e.target))) {
      this.isTouchingQuickAdd = true;
      return;
    }

    this.isTouchingQuickAdd = false;
    this.touchStartX = e.touches[0].clientX;
    this.touchEndX = this.touchStartX;
  }

  handleTouchMove(e) {
    if (this.isTouchingQuickAdd) return;
    this.touchEndX = e.touches[0].clientX;
  }

  handleTouchEnd() {
    if (this.isTouchingQuickAdd) {
      this.isTouchingQuickAdd = false;
      return;
    }

    const diff = this.touchStartX - this.touchEndX;
    if (Math.abs(diff) > 50) {
      this.navigate(diff > 0 ? 'next' : 'prev');
    }
  }

  handlePrevClick(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (!this.isNavigating) {
      this.navigate('prev');
    }
  }

  handleNextClick(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (!this.isNavigating) {
      this.navigate('next');
    }
  }

  navigate(direction) {
    if (this.isNavigating) return;

    this.isNavigating = true;
    const newIndex =
      direction === 'next'
        ? (this.currentIndex + 1) % this.slides.length
        : (this.currentIndex - 1 + this.slides.length) % this.slides.length;

    this.goToSlide(newIndex);

    setTimeout(() => {
      this.isNavigating = false;
    }, 300);
  }

  goToSlide(index) {
    this.slides.forEach((slide) => slide.classList.remove('active'));
    this.slides[index].classList.add('active');
    this.currentIndex = index;
    this.preloadAdjacentImages();
  }

  preloadAdjacentImages() {
    const nextIndex = (this.currentIndex + 1) % this.slides.length;
    const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;

    [nextIndex, prevIndex].forEach((index) => {
      const image = this.slides[index].querySelector('img');
      if (image?.dataset.src) {
        image.src = image.dataset.src;
        delete image.dataset.src;
      }
    });
  }

  destroy() {
    if (this.prevButton) {
      this.prevButton.removeEventListener('click', this.handlePrevClick);
    }
    if (this.nextButton) {
      this.nextButton.removeEventListener('click', this.handleNextClick);
    }
    this.container.removeEventListener('touchstart', this.handleTouchStart);
    this.container.removeEventListener('touchmove', this.handleTouchMove);
    this.container.removeEventListener('touchend', this.handleTouchEnd);
  }
}

// Make ProductCardCarousel globally available
window.ProductCardCarousel = ProductCardCarousel;

// Initialize carousels
function initializeCarousels() {
  // Clean up existing carousels
  document.querySelectorAll('.product-card__carousel.initialized').forEach((carousel) => {
    const instance = carousel._carouselInstance;
    if (instance) {
      instance.destroy();
    }
    carousel.classList.remove('initialized');
  });

  // Initialize new carousels
  document.querySelectorAll('.product-card__carousel:not(.initialized)').forEach((carousel) => {
    if (carousel.querySelector('.product-card__slide')) {
      carousel.classList.add('initialized');
      carousel._carouselInstance = new ProductCardCarousel(carousel);
    }
  });
}

// Reinitialize functionality
function reinitializeAllFunctionality() {
  setTimeout(() => {
    initializeCarousels();
    if (typeof initializeSwatches === 'function') initializeSwatches();
    if (typeof initializeQuickAdd === 'function') initializeQuickAdd();
  }, 100);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeCarousels);

// Handle dynamic content updates
const events = [
  'collection:updated',
  'cart:add',
  'cart:update',
  'cart:refresh',
  'shopify:section:load',
  'cart-drawer:close',
  'modal:close',
  'ajax:complete',
];

events.forEach((event) => {
  document.addEventListener(event, reinitializeAllFunctionality);
});

// Handle infinite scroll
if (window.Ajaxinate) {
  document.addEventListener('ajaxinate:load', reinitializeAllFunctionality);
}

// Setup mutation observer for product grid
const productGridObserver = new MutationObserver((mutations) => {
  const shouldReinitialize = mutations.some((mutation) =>
    Array.from(mutation.addedNodes).some(
      (node) =>
        node instanceof Element && (node.classList?.contains('product-card') || node.querySelector('.product-card'))
    )
  );

  if (shouldReinitialize) {
    reinitializeAllFunctionality();
  }
});

// Start observing product grid
function startObservingGrid() {
  const productGrid = document.getElementById('product-grid');
  if (productGrid) {
    productGridObserver.observe(productGrid, {
      childList: true,
      subtree: true,
    });
  }
}

// Initialize observer
document.addEventListener('DOMContentLoaded', startObservingGrid);

// Handle lazy loading
document.addEventListener('lazyloaded', (e) => {
  if (e.target.closest('.product-card')) {
    reinitializeAllFunctionality();
  }
});

// Optimized scroll handling
let scrollTimeout;
window.addEventListener(
  'scroll',
  () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(reinitializeAllFunctionality, 500);
  },
  { passive: true }
);

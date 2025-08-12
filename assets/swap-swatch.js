// Function to fetch product data by handle
window.fetchProductData = function (handle, cardWrapper, badgeValue, productId, variantId, label) {
  const url = `/products/${handle}.js`;

  // Show loading spinner
  const mediaContainer = cardWrapper.querySelector('.product-card__media');
  let spinner;
  if (mediaContainer) {
    // Remove any existing spinner first
    const existingSpinner = mediaContainer.querySelector('.loading-spinner');
    if (existingSpinner) {
      existingSpinner.remove();
    }

    spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
      <svg class="spinner" viewBox="0 0 50 50">
        <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
      </svg>
    `;
    mediaContainer.appendChild(spinner);
  }

  const removeSpinner = () => {
    if (spinner && spinner.parentNode) {
      spinner.remove();
    }
  };

  // Create a temporary container for new content
  const tempContainer = document.createElement('div');
  tempContainer.style.display = 'none';

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Product not found');
      }
      return response.json();
    })
    .then((productData) => {
      let images = productData.images;
      let comparePrice = productData.variants[0].compare_at_price;
      let price = productData.variants[0].price;
      let title = productData.title;
      let productUrl = `/products/${handle}`;
      let variants = productData.variants;

      // Find the correct variant based on the variantId passed to the function
      const selectedVariant = productData.variants.find((v) => v.id.toString() === variantId.toString());
      if (selectedVariant) {
        comparePrice = selectedVariant.compare_at_price;
        price = selectedVariant.price;
      }

      // Create new carousel content in temporary container
      const carouselTrack = document.createElement('div');
      carouselTrack.className = 'product-card__carousel-track';
      tempContainer.appendChild(carouselTrack);

      // Create image loading promises
      const imageLoadPromises = images.slice(0, 4).map((image, index) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const slide = document.createElement('div');
            slide.className = `product-card__slide${index === 0 ? ' active' : ''}`;
            slide.setAttribute('data-index', index);
            slide.innerHTML = `
              <img
                srcset="${image} 165w, ${image} 360w, ${image} 533w, ${image} 720w"
                src="${image}"
                sizes="(min-width: ${window.settings?.page_width || 1440}px) ${
              window.settings?.page_width - 130 || 1310
            }/4 }}px, (min-width: 990px) calc((100vw - 130px) / 4), (min-width: 750px) calc((100vw - 120px) / 3), calc((100vw - 35px) / 2)"
                alt="${title}"
                ${index !== 0 ? 'loading="lazy"' : ''}
                width="533"
                height="533"
              >
            `;
            carouselTrack.appendChild(slide);
            resolve();
          };
          img.onerror = () => {
            reject(new Error(`Failed to load image: ${image}`));
          };
          img.src = image;
        });
      });

      // Wait for all images to load before updating the DOM
      Promise.all(imageLoadPromises)
        .then(() => {
          // Update carousel
          const existingCarouselTrack = cardWrapper.querySelector('.product-card__carousel-track');
          const existingCarousel = cardWrapper.querySelector('.product-card__carousel');

          if (existingCarouselTrack && existingCarousel) {
            existingCarouselTrack.replaceWith(carouselTrack);
          } else {
            // If no existing carousel structure, find the media link and update its content
            const mediaLink = cardWrapper.querySelector('.product-card__media-link');
            if (mediaLink) {
              // Create new carousel container
              const newCarousel = document.createElement('div');
              newCarousel.className = 'product-card__carousel';
              newCarousel.appendChild(carouselTrack);

              // Clear existing content and add new carousel
              mediaLink.innerHTML = '';
              mediaLink.appendChild(newCarousel);
            }
          }

          // Reinitialize carousel
          const carousel = cardWrapper.querySelector('.product-card__carousel');
          if (carousel) {
            // Remove initialized class to allow reinitialization
            carousel.classList.remove('initialized');
            // Destroy existing carousel instance if it exists
            if (carousel._carouselInstance) {
              carousel._carouselInstance.destroy();
            }
            // Initialize new carousel instance with error handling
            try {
              if (typeof window.ProductCardCarousel === 'function') {
                carousel._carouselInstance = new window.ProductCardCarousel(carousel);
                carousel.classList.add('initialized');
              } else {
                // Fallback: use the existing initCarousel function
                initCarousel(carouselTrack);
              }
            } catch (error) {
              // Fallback: use the existing initCarousel function
              initCarousel(carouselTrack);
            }
          }

          // Update variant list (Note: may not exist in new card structure)
          const variantList = cardWrapper.querySelector('#variant-list');
          if (variantList) {
            variantList.innerHTML = '';
            productData.variants.forEach((variant) => {
              const sizeOnly = variant.title.split('/')[0].trim();
              const listItem = document.createElement('li');
              listItem.innerHTML = `
              <input type="radio" 
                     data-variant-id="${variant.id}" 
                     class="visually-hidden">
              <label class="add-to-cart-button${variant.available ? '' : ' unavailable'}" 
                     data-variant-id="${variant.id}">
                  ${sizeOnly}
              </label>
            `;
              variantList.appendChild(listItem);
            });
          }

          // Update price elements
          const priceContainer = cardWrapper.querySelector('.price__container');
          const regularPriceElement = cardWrapper.querySelector('.price__regular .price-item--regular');
          const salePriceElement = cardWrapper.querySelector('.price__sale .price-item--regular');
          const finalPriceElement = cardWrapper.querySelector('.price__sale .price-item--sale.price-item--last');

          if (comparePrice != null && comparePrice > 0) {
            if (regularPriceElement) regularPriceElement.textContent = `$${(comparePrice / 100).toFixed(2)} AUD`;
            if (salePriceElement) salePriceElement.textContent = `$${(comparePrice / 100).toFixed(2)} AUD`;
            if (finalPriceElement) finalPriceElement.textContent = `$${(price / 100).toFixed(2)}`;
          } else {
            if (regularPriceElement) regularPriceElement.textContent = `$${(price / 100).toFixed(2)} AUD`;
            if (salePriceElement) salePriceElement.textContent = '';
            if (finalPriceElement) finalPriceElement.textContent = '';
          }

          // Update the product title and URL
          const headingElement = cardWrapper.querySelector('.card__heading');
          if (headingElement) {
            headingElement.textContent = title;
          }

          const mediaLink = cardWrapper.querySelector('.product-card__media-link');
          if (mediaLink) {
            mediaLink.href = productUrl;
          }

          const contentLink = cardWrapper.querySelector('.product-card__content-link');
          if (contentLink) {
            contentLink.href = productUrl;
          }

          // Update all anchor tags within the card that link to a product
          const productLinks = cardWrapper.querySelectorAll('a[href*="/products/"]');
          productLinks.forEach((link) => {
            link.href = productUrl;
          });

          // Update badge
          const badgeElement = cardWrapper.querySelector('.product-card__badge .badge');
          if (badgeElement) {
            badgeElement.textContent = badgeValue;
            badgeElement.classList.toggle('hidden', badgeValue === '');
          }

          // Update label
          const labelElement = cardWrapper.querySelector('.product-card__bottom-label');
          if (labelElement) {
            labelElement.textContent = label;
            labelElement.classList.toggle('hidden', label === '');
          }

          // Update wishlist button
          const addToWishlistButton = cardWrapper.querySelector('.swym-button.swym-add-to-wishlist-view-product');
          if (addToWishlistButton) {
            addToWishlistButton.setAttribute('data-product-id', productId);
            addToWishlistButton.setAttribute('data-variant-id', variantId);
            addToWishlistButton.setAttribute('href', `/products/${handle}?variant=${variantId}`);

            const currentClass = [...addToWishlistButton.classList].find((className) =>
              className.startsWith('product_')
            );
            if (currentClass) {
              addToWishlistButton.classList.remove(currentClass);
            }
            addToWishlistButton.classList.add(`product_${productId}`);
          }

          // Preserve quick-add container state before reinitialization
          const quickAddContainer = cardWrapper.querySelector('.quick-add-container');
          const submitContainer = cardWrapper.querySelector('.quick-add-submit-container');
          const mobileCartIcon = cardWrapper.querySelector('.mobile-cart-icon');

          const wasQuickAddOpen = quickAddContainer?.classList.contains('open');
          const wasSubmitVisible = submitContainer?.classList.contains('visible');
          const wasMobileCartHidden = mobileCartIcon?.classList.contains('hidden');

          // Store hover state - check if user is still hovering over the card
          const isCurrentlyHovering = cardWrapper.matches(':hover');

          // Set a flag on the card wrapper to preserve state during reinitialization
          if (wasQuickAddOpen || isCurrentlyHovering) {
            cardWrapper.dataset.preserveQuickAddState = 'true';
          }

          // Reset quick-add initialization state
          cardWrapper.classList.remove('quick-add-initialized');

          // Reinitialize quick-add functionality
          if (typeof window.setupQuickAdd === 'function') {
            window.setupQuickAdd();
          }

          // Restore quick-add container state after reinitialization
          requestAnimationFrame(() => {
            setTimeout(() => {
              const updatedQuickAddContainer = cardWrapper.querySelector('.quick-add-container');
              const updatedSubmitContainer = cardWrapper.querySelector('.quick-add-submit-container');
              const updatedMobileCartIcon = cardWrapper.querySelector('.mobile-cart-icon');

              // Restore state if it was open OR if user is still hovering
              if ((wasQuickAddOpen || isCurrentlyHovering) && updatedQuickAddContainer) {
                updatedQuickAddContainer.classList.remove('hidden');
                requestAnimationFrame(() => {
                  updatedQuickAddContainer.classList.add('open');

                  // Force CSS hover state to be applied if user is hovering
                  if (isCurrentlyHovering) {
                    const quickAddParent = cardWrapper.querySelector('.product-card__quick-add');
                    if (quickAddParent) {
                      quickAddParent.style.opacity = '1';
                      quickAddParent.style.transform = 'translateY(0)';
                      quickAddParent.style.pointerEvents = 'auto';
                    }
                  }
                });
              }
              if ((wasSubmitVisible || isCurrentlyHovering) && updatedSubmitContainer) {
                updatedSubmitContainer.classList.add('visible');
              }
              if (wasMobileCartHidden && updatedMobileCartIcon) {
                updatedMobileCartIcon.classList.add('hidden');
              }

              // Clean up the preservation flag
              delete cardWrapper.dataset.preserveQuickAddState;
            }, 100);
          });

          // Reinitialize cart manager if it exists
          if (window.cartManager && typeof window.cartManager.initialize === 'function') {
            window.cartManager.initialize();
          }

          // Remove loading spinner
          removeSpinner();
        })
        .catch((error) => {
          removeSpinner();
        });
    })
    .catch((error) => {
      removeSpinner();
    });
};

// Function to initialize swatches
function initializeSwatches() {
  const swatches = document.querySelectorAll('.product-card__swatch:not(.initialized)');

  swatches.forEach((swatch, index) => {
    swatch.classList.add('initialized');
    swatch.addEventListener('click', function (event) {
      event.preventDefault();

      const cardWrapper = swatch.closest('.product-card');
      if (!cardWrapper) {
        return;
      }

      // Remove active state from all swatches in this card
      const allSwatches = cardWrapper.querySelectorAll('.product-card__swatch');
      allSwatches.forEach((sw) => sw.classList.remove('active'));
      // Add active state to clicked swatch
      swatch.classList.add('active');

      const productUrl = swatch.getAttribute('data-url');
      // Extract handle and remove any query parameters
      const handle = productUrl.split('/products/')[1]?.split('?')[0];
      const productId = swatch.getAttribute('data-id');
      const variantId = swatch.getAttribute('data-variant-id');
      const badgeValue = swatch.getAttribute('data-badge');
      const label = swatch.getAttribute('data-label');

      // Validate that we have a clean handle
      if (!handle) {
        return;
      }

      window.fetchProductData(handle, cardWrapper, badgeValue, productId, variantId, label);
    });
  });
}

// Initialize swatches on page load
document.addEventListener('DOMContentLoaded', initializeSwatches);

// Initialize swatches for newly loaded products
document.addEventListener('products:added', () => {
  // Use requestAnimationFrame to ensure DOM is updated
  requestAnimationFrame(() => {
    // Add a small delay to ensure DOM is fully ready
    setTimeout(() => {
      initializeSwatches();
    }, 50);
  });
});

// Add spinner styles
const style = document.createElement('style');
style.textContent = `
  .loading-spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
  }
  .spinner {
    width: 40px;
    height: 40px;
    animation: rotate 2s linear infinite;
  }
  .spinner .path {
    stroke: rgb(var(--color-foreground));
    stroke-linecap: round;
    animation: dash 1.5s ease-in-out infinite;
  }
  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }
  @keyframes dash {
    0% {
      stroke-dasharray: 1, 150;
      stroke-dashoffset: 0;
    }
    50% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -35;
    }
    100% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -124;
    }
  }
`;
document.head.appendChild(style);

// Function to initialize card swatches on product cards
document.addEventListener('DOMContentLoaded', initializeCardSwatches);
document.addEventListener('products:added', () => {
  // Use requestAnimationFrame to ensure DOM is updated
  requestAnimationFrame(() => {
    // Add a small delay to ensure DOM is fully ready
    setTimeout(() => {
      initializeCardSwatches();
    }, 50);
  });
});

window.initializeCardSwatches = function () {
  const swatches = document.querySelectorAll('.product-card__swatch:not(.swatch-initialized)');

  swatches.forEach((swatch, index) => {
    swatch.classList.add('swatch-initialized');
    const productUrl = swatch.getAttribute('data-url');
    const productId = swatch.getAttribute('data-id');
    if (!productUrl || !productId) {
      return;
    }

    // Clean the URL to remove query parameters
    const cleanProductUrl = productUrl.split('?')[0];

    fetch(`${cleanProductUrl}.json`)
      .then((res) => res.json())
      .then((data) => {
        swatch.classList.add('is-available');
        const cardWrapper = swatch.closest('.product-card');
        const priceElement = cardWrapper?.querySelector('.price-item--sale.price-item--last');
        if (priceElement) {
          priceElement.textContent = `$${(data.product.variants[0].price / 100).toFixed(2)}`;
        }
      })
      .catch((error) => {
        swatch.classList.add('not-available');
      });
  });
};

// Initialize carousel functionality
function initCarousel(carouselTrack) {
  const slides = carouselTrack.querySelectorAll('.product-card__slide');
  const navButtons = carouselTrack.closest('.product-card__carousel').querySelectorAll('.product-card__nav-btn');
  let currentIndex = 0;
  let startX = 0;
  let isDragging = false;

  // Preload all images
  slides.forEach((slide) => {
    const img = slide.querySelector('img');
    if (img) {
      img.loading = 'eager';
    }
  });

  // Handle navigation buttons
  navButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const direction = button.getAttribute('data-direction');
      if (direction === 'next') {
        currentIndex = (currentIndex + 1) % slides.length;
      } else {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
      }
      updateSlides();
    });
  });

  // Handle touch events
  carouselTrack.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
  });

  carouselTrack.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = startX - currentX;

    if (Math.abs(diff) > 50) {
      // Threshold for swipe
      if (diff > 0) {
        currentIndex = (currentIndex + 1) % slides.length;
      } else {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
      }
      updateSlides();
      isDragging = false;
    }
  });

  carouselTrack.addEventListener('touchend', () => {
    isDragging = false;
  });

  function updateSlides() {
    // Remove active class from all slides
    slides.forEach((slide) => {
      slide.classList.remove('active');
    });

    // Add active class to current slide
    const currentSlide = slides[currentIndex];
    if (currentSlide) {
      currentSlide.classList.add('active');

      // Ensure the image is loaded
      const img = currentSlide.querySelector('img');
      if (img && !img.complete) {
        img.loading = 'eager';
      }
    }
  }

  // Initialize first slide
  updateSlides();
}

// Initialize all carousels on the page
document.addEventListener('DOMContentLoaded', () => {
  const carousels = document.querySelectorAll('.product-card__carousel-track');
  carousels.forEach((carousel) => {
    initCarousel(carousel);
  });
});

// Function to fetch product data by handle
window.fetchProductData = function (handle, cardWrapper, badgeValue, productId, variantId, label) {
  const url = `/products/${handle}.js`;

  // Show loading spinner
  const mediaContainer = cardWrapper.querySelector('.card__media');
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
      carouselTrack.className = 'card__media-carousel-track';
      tempContainer.appendChild(carouselTrack);

      // Create image loading promises
      const imageLoadPromises = images.slice(0, 4).map((image, index) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const slide = document.createElement('div');
            slide.className = `card__media-slide${index === 0 ? ' active' : ''}`;
            slide.setAttribute('data-index', index);
            slide.innerHTML = `
              <a href="${productUrl}" class="media media--transparent media--hover-effect">
                <img
                  srcset="${image} 165w, ${image} 360w, ${image} 533w, ${image} 720w"
                  src="${image}"
                  sizes="(min-width: ${window.settings?.page_width || 1440}px) ${
              window.settings?.page_width - 130 || 1310
            }/4 }}px, (min-width: 990px) calc((100vw - 130px) / 4), (min-width: 750px) calc((100vw - 120px) / 3), calc((100vw - 35px) / 2)"
                  alt="${title}"
                  class="motion-reduce"
                  ${index !== 0 ? 'loading="lazy"' : ''}
                  width="533"
                  height="533"
                >
              </a>
            `;
            carouselTrack.appendChild(slide);
            resolve();
          };
          img.src = image;
        });
      });

      // Wait for all images to load before updating the DOM
      Promise.all(imageLoadPromises).then(() => {
        // Update carousel
        const existingCarouselTrack = cardWrapper.querySelector('.card__media-carousel-track');
        if (existingCarouselTrack) {
          existingCarouselTrack.replaceWith(carouselTrack);
        }

        // Reinitialize carousel
        const carousel = carouselTrack.closest('.card__media-carousel');
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
              console.warn('ProductCardCarousel not available, using fallback carousel initialization');
              // Fallback: use the existing initCarousel function
              initCarousel(carouselTrack);
            }
          } catch (error) {
            console.error('Error reinitializing carousel:', error);
            // Fallback: use the existing initCarousel function
            initCarousel(carouselTrack);
          }
        }

        // Update variant list
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

        // Get currency formatting from existing price elements
        const formatPrice = (priceInCents) => {
          // Try to get currency formatting from existing price elements
          const existingPriceElement = document.querySelector('.price-item--regular, .price-item--sale');
          if (existingPriceElement) {
            const existingText = existingPriceElement.textContent.trim();
            console.log('Existing price format:', existingText);

            // Extract currency symbol and position from existing price format
            const priceMatch = existingText.match(/(\d+(?:[.,]\d{2})?)/);
            if (priceMatch) {
              const numericPart = priceMatch[1];
              const beforeCurrency = existingText.substring(0, existingText.indexOf(numericPart));
              const afterCurrency = existingText.substring(existingText.indexOf(numericPart) + numericPart.length);

              // Format the new price using the same pattern, maintaining decimal separator
              const useCommaDecimal = numericPart.includes(',');
              let formattedPrice = (priceInCents / 100).toFixed(2);
              if (useCommaDecimal) {
                formattedPrice = formattedPrice.replace('.', ',');
              }

              const result = `${beforeCurrency}${formattedPrice}${afterCurrency}`;
              console.log('Formatted price using existing pattern:', result);
              return result;
            }
          }

          // Try to use JavaScript's Intl.NumberFormat if available
          try {
            const currencyCode =
              (typeof afterpay_cart_currency !== 'undefined' && afterpay_cart_currency) ||
              (typeof afterpay_shop_currency !== 'undefined' && afterpay_shop_currency) ||
              'USD';

            // Try to get locale from global variables or detect from page
            const locale =
              typeof afterpay_js_language !== 'undefined' && afterpay_js_language
                ? `${afterpay_js_language}-${afterpay_js_country || afterpay_js_language.toUpperCase()}`
                : document.documentElement.lang || 'en-US';

            const result = new Intl.NumberFormat(locale, {
              style: 'currency',
              currency: currencyCode,
              minimumFractionDigits: 2,
            }).format(priceInCents / 100);
            console.log('Formatted price using Intl.NumberFormat:', result);
            return result;
          } catch (e) {
            console.warn('Failed to format currency with Intl.NumberFormat:', e);
            // Fallback to basic formatting based on detected currency
            const currencyCode =
              (typeof afterpay_cart_currency !== 'undefined' && afterpay_cart_currency) ||
              (typeof afterpay_shop_currency !== 'undefined' && afterpay_shop_currency) ||
              'USD';
            const price = (priceInCents / 100).toFixed(2).replace('.', ',');

            let result;
            if (currencyCode === 'PLN') {
              result = `${price} zł`;
            } else if (currencyCode === 'EUR') {
              result = `€ ${price}`;
            } else if (currencyCode === 'USD') {
              result = `$${price}`;
            } else {
              result = `${price} ${currencyCode}`;
            }
            console.log('Formatted price using fallback:', result);
            return result;
          }
        };

        const formatPriceWithoutCurrency = (priceInCents) => {
          const existingPriceElement = document.querySelector('.price-item--sale.price-item--last');
          if (existingPriceElement) {
            const existingText = existingPriceElement.textContent.trim();
            const useCommaDecimal = existingText.includes(',');
            let formattedPrice = (priceInCents / 100).toFixed(2);
            if (useCommaDecimal) {
              formattedPrice = formattedPrice.replace('.', ',');
            }
            return formattedPrice;
          }

          const locale =
            typeof afterpay_js_language !== 'undefined' && afterpay_js_language
              ? `${afterpay_js_language}-${afterpay_js_country || afterpay_js_language.toUpperCase()}`
              : document.documentElement.lang || 'en-US';

          const useCommaDecimal =
            locale.includes('pl') || locale.includes('de') || locale.includes('fr') || locale.includes('es');
          let formattedPrice = (priceInCents / 100).toFixed(2);
          if (useCommaDecimal) {
            formattedPrice = formattedPrice.replace('.', ',');
          }
          return formattedPrice;
        };

        if (comparePrice != null && comparePrice > 0) {
          if (regularPriceElement) regularPriceElement.textContent = formatPrice(comparePrice);
          if (salePriceElement) salePriceElement.textContent = formatPrice(comparePrice);
          if (finalPriceElement) finalPriceElement.textContent = formatPriceWithoutCurrency(price);
        } else {
          if (regularPriceElement) regularPriceElement.textContent = formatPrice(price);
          if (salePriceElement) salePriceElement.textContent = '';
          if (finalPriceElement) finalPriceElement.textContent = '';
        }

        // Update the product title and URL - handle both anchor-based and direct h3 titles
        console.log('Updating title to:', title);

        // Update all h3 elements with card__heading class
        const h3Elements = cardWrapper.querySelectorAll('h3.card__heading');
        let updatedCount = 0;

        h3Elements.forEach((h3) => {
          const anchor = h3.querySelector('a');
          if (anchor) {
            // Update anchor text and href
            anchor.textContent = title;
            anchor.href = productUrl;
            console.log('Updated anchor in h3:', anchor);
            updatedCount++;
          } else if (h3.textContent.trim() && !h3.querySelector('a')) {
            // Update direct text content in h3 (only if it has text and no anchor)
            h3.textContent = title;
            console.log('Updated h3 directly:', h3);
            updatedCount++;
          }
        });

        if (updatedCount === 0) {
          console.warn('Could not find any product title elements to update');
        } else {
          console.log(`Updated ${updatedCount} title elements`);
        }

        const mediaLink = cardWrapper.querySelector('.media-link');
        if (mediaLink) {
          mediaLink.href = productUrl;
        }

        // Update all anchor tags within the card that link to a product
        const productLinks = cardWrapper.querySelectorAll('a[href*="/products/"]');
        productLinks.forEach((link) => {
          link.href = productUrl;
        });

        // Also update anchor tags that wrap the card__information section
        const cardInfoLinks = cardWrapper.querySelectorAll('.card__content > a.full-unstyled-link');
        cardInfoLinks.forEach((link) => {
          link.href = productUrl;
        });

        // Update badge
        const badgeElement = cardWrapper.querySelector('.card__badge span');
        if (badgeElement) {
          badgeElement.textContent = badgeValue;
          badgeElement.classList.toggle('hidden', badgeValue === '');
        }

        // Update label
        const labelElement = cardWrapper.querySelector('.bottom-label-text');
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

          const currentClass = [...addToWishlistButton.classList].find((className) => className.startsWith('product_'));
          if (currentClass) {
            addToWishlistButton.classList.remove(currentClass);
          }
          addToWishlistButton.classList.add(`product_${productId}`);
        }

        // Reset quick-add initialization state
        cardWrapper.classList.remove('quick-add-initialized');

        // Reinitialize quick-add functionality
        if (typeof window.setupQuickAdd === 'function') {
          window.setupQuickAdd();
        }

        // Reinitialize cart manager if it exists
        if (window.cartManager && typeof window.cartManager.initialize === 'function') {
          window.cartManager.initialize();
        }

        // Remove loading spinner
        removeSpinner();
      });
    })
    .catch((error) => {
      console.error('Error fetching product data:', error);
      removeSpinner();
    });
};

// Function to initialize swatches
function initializeSwatches() {
  const swatches = document.querySelectorAll('.card-swatch:not(.initialized)');

  swatches.forEach((swatch, index) => {
    swatch.classList.add('initialized');
    swatch.addEventListener('click', function (event) {
      event.preventDefault();

      const cardWrapper = swatch.closest('.product-card-wrapper');
      if (!cardWrapper) {
        console.error('Could not find product-card-wrapper for swatch');
        return;
      }

      // Remove active state from all swatches in this card
      const allSwatches = cardWrapper.querySelectorAll('.card-swatch');
      allSwatches.forEach((sw) => sw.classList.remove('card-swatch--current'));
      // Add active state to clicked swatch
      swatch.classList.add('card-swatch--current');

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
window.initializeCardSwatches = function () {
  const swatches = document.querySelectorAll('.card-swatch:not(.swatch-initialized)');

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
        const cardWrapper = swatch.closest('.card-wrapper');
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

// Initialize card swatches on page load
// Use window.initializeCardSwatches in event listeners

document.addEventListener('DOMContentLoaded', window.initializeCardSwatches);
document.addEventListener('products:added', () => {
  // Use requestAnimationFrame to ensure DOM is updated
  requestAnimationFrame(() => {
    // Add a small delay to ensure DOM is fully ready
    setTimeout(() => {
      window.initializeCardSwatches();
    }, 50);
  });
});

// Initialize carousel functionality
function initCarousel(carouselTrack) {
  const slides = carouselTrack.querySelectorAll('.card__media-slide');
  const navButtons = carouselTrack.closest('.card__media-carousel').querySelectorAll('.card__media-nav-button');
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
  const carousels = document.querySelectorAll('.card__media-carousel-track');
  carousels.forEach((carousel) => {
    initCarousel(carousel);
  });
});

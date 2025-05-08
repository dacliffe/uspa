// Function to fetch product data by handle
window.fetchProductData = function (handle, cardWrapper, badgeValue, productId, variantId, label) {
  const url = `/products/${handle}.js`;

  // Show loading spinner
  const mediaContainer = cardWrapper.querySelector('.card__media');
  if (mediaContainer) {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
      <svg class="spinner" viewBox="0 0 50 50">
        <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
      </svg>
    `;
    mediaContainer.appendChild(spinner);
  }

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

      // Update carousel images
      const carouselTrack = cardWrapper.querySelector('.card__media-carousel-track');
      if (carouselTrack) {
        carouselTrack.innerHTML = '';
        images.slice(0, 4).forEach((image, index) => {
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
        });

        // Reinitialize carousel
        const carousel = carouselTrack.closest('.card__media-carousel');
        if (carousel) {
          carousel.classList.remove('initialized');
          new ProductCardCarousel(carousel);
        }
      }

      const variantList = cardWrapper.querySelector('#variant-list');
      if (variantList) {
        variantList.innerHTML = '';
        // Iterate over each variant and create a list item
        productData.variants.forEach((variant) => {
          const listItem = document.createElement('li');
          listItem.innerHTML = `
              <input type="radio" 
                     data-variant-id="${variant.id}" 
                     class="visually-hidden">
              <label class="add-to-cart-button${variant.available ? '' : ' unavailable'}" 
                     data-variant-id="${variant.id}">
                  ${variant.title}
              </label>
            `;
          variantList.appendChild(listItem);
        });
      }

      setTimeout(() => {
        // Update price elements
        const priceContainer = cardWrapper.querySelector('.price__container');
        const comparePriceElement = cardWrapper.querySelector('.price-item--regular');
        const salePriceElement = cardWrapper.querySelector('.price-item--sale.price-item--last');

        // Update prices
        if (comparePrice != null && comparePrice > 0) {
          // Show compare price and update both prices
          if (comparePriceElement) {
            comparePriceElement.textContent = `$${(comparePrice / 100).toFixed(2)}`;
            comparePriceElement.classList.remove('hidden');
          }
          if (salePriceElement) {
            salePriceElement.textContent = `$${(price / 100).toFixed(2)}`;
          }
        } else {
          // No compare price - just show the regular price
          if (comparePriceElement) {
            comparePriceElement.textContent = '';
            comparePriceElement.classList.add('hidden');
          }
          if (salePriceElement) {
            salePriceElement.textContent = `$${(price / 100).toFixed(2)}`;
          }
        }

        // Update the product title and URL
        const headingElement = cardWrapper.querySelector('.card__title a');
        if (headingElement) {
          headingElement.textContent = title;
          headingElement.href = productUrl;
        }

        const mediaLink = cardWrapper.querySelector('.media-link');
        if (mediaLink) {
          mediaLink.href = productUrl;
        }

        // Update the badge content if the element and badge value exist
        const badgeElement = cardWrapper.querySelector('.card__badge span');
        if (badgeElement) {
          badgeElement.textContent = badgeValue;
          if (badgeValue === '') {
            badgeElement.classList.add('hidden');
          } else {
            badgeElement.classList.remove('hidden');
          }
        }

        // Update the label content if the element and label value exist
        const labelElement = cardWrapper.querySelector('.bottom-label-text');
        if (labelElement) {
          labelElement.textContent = label;
          if (label === '') {
            labelElement.classList.add('hidden');
          } else {
            labelElement.classList.remove('hidden');
          }
        }

        // Update the Add to Wishlist button
        const addToWishlistButton = cardWrapper.querySelector('.swym-button.swym-add-to-wishlist-view-product');
        if (addToWishlistButton) {
          addToWishlistButton.setAttribute('data-product-id', productId);
          addToWishlistButton.setAttribute('data-variant-id', variantId);

          const wishlistUrl = `/products/${handle}?variant=${variantId}`;
          addToWishlistButton.setAttribute('href', wishlistUrl);

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
        if (window.cartManager) {
          window.cartManager.initialize();
        }

        // Remove loading spinner
        const spinner = mediaContainer?.querySelector('.loading-spinner');
        if (spinner) {
          spinner.remove();
        }
      }, 50); // 50ms delay to allow images to load first
    })
    .catch((error) => {
      console.error('Error fetching product data:', error);
      // Remove loading spinner on error
      const spinner = mediaContainer?.querySelector('.loading-spinner');
      if (spinner) {
        spinner.remove();
      }
    });
};

// Function to initialize swatches
function initializeSwatches() {
  const swatches = document.querySelectorAll('.card-swatch:not(.initialized)');
  swatches.forEach((swatch) => {
    swatch.classList.add('initialized');
    swatch.addEventListener('click', function (event) {
      event.preventDefault();

      const cardWrapper = swatch.closest('.product-card-wrapper');
      // Remove active state from all swatches in this card
      const allSwatches = cardWrapper.querySelectorAll('.card-swatch');
      allSwatches.forEach((sw) => sw.classList.remove('card-swatch--current'));
      // Add active state to clicked swatch
      swatch.classList.add('card-swatch--current');

      const productUrl = swatch.getAttribute('data-url');
      const handle = productUrl.split('/products/')[1];
      const productId = swatch.getAttribute('data-id');
      const variantId = swatch.getAttribute('data-variant-id');
      const badgeValue = swatch.getAttribute('data-badge');
      const label = swatch.getAttribute('data-label');

      window.fetchProductData(handle, cardWrapper, badgeValue, productId, variantId, label);
    });
  });
}

// Initialize swatches on page load
document.addEventListener('DOMContentLoaded', initializeSwatches);

// Initialize swatches for newly loaded products
document.addEventListener('products:added', initializeSwatches);

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

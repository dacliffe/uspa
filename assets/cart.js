class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
      cartItems.updateQuantity(this.dataset.index, 0, event);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement =
      document.getElementById('shopping-cart-line-item-status') || document.getElementById('CartDrawer-LineItemStatus');

    const debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener('change', debouncedOnChange.bind(this));
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === 'cart-items') {
        return;
      }
      return this.onCartUpdate();
    });

    // Handle initial cart drawer load with items
    if (this.tagName === 'CART-DRAWER-ITEMS') {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const cartItemsTable = document.querySelector('.cart-items tbody');
        const upsellSection = document.querySelector('#Upsell-Product');
        const hasCartItems = cartItemsTable && document.querySelectorAll('.cart-item').length > 0;

        if (hasCartItems && !upsellSection) {
          // Create and inject the upsell section for initial load
          const { upsellHTML, upsellStyles } = this.createUpsellSection();

          // Add styles if not already present
          if (!document.querySelector('#upsell-dynamic-styles')) {
            document.head.insertAdjacentHTML('beforeend', upsellStyles);
          }

          // Add upsell row to the table
          cartItemsTable.insertAdjacentHTML('beforeend', upsellHTML);

          // Initialize upsell functionality
          this.initializeUpsellFunctionality();
        }
      }, 100);
    }
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`);
    input.value = input.getAttribute('value');
    this.isEnterPressed = false;
  }

  setValidity(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  validateQuantity(event) {
    const inputValue = parseInt(event.target.value);
    const index = event.target.dataset.index;
    let message = '';

    if (inputValue < event.target.dataset.min) {
      message = window.quickOrderListStrings.min_error.replace('[min]', event.target.dataset.min);
    } else if (inputValue > parseInt(event.target.max)) {
      message = window.quickOrderListStrings.max_error.replace('[max]', event.target.max);
    } else if (inputValue % parseInt(event.target.step) !== 0) {
      message = window.quickOrderListStrings.step_error.replace('[step]', event.target.step);
    }

    if (message) {
      this.setValidity(event, index, message);
    } else {
      event.target.setCustomValidity('');
      event.target.reportValidity();
      this.updateQuantity(
        index,
        inputValue,
        event,
        document.activeElement.getAttribute('name'),
        event.target.dataset.quantityVariantId
      );
    }
  }

  onChange(event) {
    this.validateQuantity(event);
  }

  updateProgressBar(cartTotal, itemCount) {
    const progressWrapper = document.getElementById('cart-progress-wrapper');
    if (!progressWrapper) return;

    const moneyFormat = progressWrapper.dataset.moneyFormat;
    const progressThreshold = parseInt(progressWrapper.dataset.threshold, 10);
    const preGoalMessageTemplate = progressWrapper.dataset.preGoalMessageTemplate;
    const postGoalMessage = progressWrapper.dataset.postGoalMessage;

    const progressBar = document.getElementById('cart-progress-bar');
    const goalMessageElement = document.querySelector('.goal-message');

    if (itemCount === 0 || cartTotal === 0) {
      if (progressWrapper) {
        progressWrapper.style.display = 'none';
      }
      if (goalMessageElement) {
        goalMessageElement.style.display = 'none';
      }
    } else {
      if (progressWrapper) {
        progressWrapper.style.display = 'block';
      }
      if (progressBar) {
        progressBar.style.display = 'block';
        const progressPercentage = Math.min((cartTotal / progressThreshold) * 100, 100);
        progressBar.style.width = `${progressPercentage}%`;

        if (progressPercentage >= 100) {
          progressWrapper.classList.add('full');
        } else {
          progressWrapper.classList.remove('full');
        }
      }

      if (goalMessageElement) {
        goalMessageElement.style.display = 'block';
        let remainingForGoal = progressThreshold - cartTotal;

        if (remainingForGoal < 0) {
          remainingForGoal = 0;
        }

        const remainingAmount = remainingForGoal / 100;
        const remainingAmountFormatted = moneyFormat.replace('{{amount}}', remainingAmount.toFixed(2));
        const preGoalMessage = preGoalMessageTemplate.replace('[remainingForGoalFormatted]', remainingAmountFormatted);

        goalMessageElement.innerHTML = remainingForGoal > 0 ? preGoalMessage : postGoalMessage;
      }
    }
  }

  // Function to create upsell section dynamically when cart transitions from empty to filled
  createUpsellSection() {
    const upsellHTML = `
      <tr id="Upsell-Product" role="row" style="display: none;">
        <td class="cart-item__media upsell-product__media" colspan="3" role="cell" headers="CartDrawer-ColumnProductImage">
          <div class="upsell-carousel__container">
            <div class="upsell-carousel__header">
              <h5>YOU MAY ALSO LIKE</h5>
              <div class="upsell-carousel__nav">
                <button
                  type="button"
                  class="upsell-carousel__btn upsell-carousel__btn--prev"
                  aria-label="Previous products"
                >
                  ←
                </button>
                <button type="button" class="upsell-carousel__btn upsell-carousel__btn--next" aria-label="Next products">
                  →
                </button>
              </div>
            </div>
            <div class="upsell-carousel__wrapper">
              <div class="upsell-carousel__track">
                <div class="upsell-carousel__slides" id="upsell-carousel-slides">
                  <!-- Products will be dynamically inserted here -->
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;

    const upsellStyles = `
      <style id="upsell-dynamic-styles">
        table:not([class]) {
          box-shadow: none;
        }

        table:not([class]) td,
        table:not([class]) th {
          border: none !important;
          padding: 0 !important;
        }

        fieldset.js.product-form__input.product-form__input--pill {
          border: none !important;
          padding: 0 !important;
        }

        .cart-spinner {
          position: relative;
          right: 0 !important;
          padding: 0 !important;
          padding-top: 0 !important;
        }

        .price-label {
          font-size: 10px;
        }

        .cart-item__final-price.product-option {
          padding-left: 5px;
        }

        .cart-item.loading {
          transition: opacity 0.3s ease;
        }

        #Upsell-Product {
          border-top: 1px solid rgba(var(--color-foreground), 0.2) !important;
        }

        #Upsell-Product td {
          border-top: 1px solid rgba(var(--color-foreground), 0.2) !important;
        }

        .upsell-product__media {
          padding: 20px 10px;
          width: 50% !important;
        }

        .upsell-carousel__container {
          width: 100%;
          margin-top: 10px;
        }

        .upsell-carousel__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-top: 10px;
        }

        .upsell-carousel__header h4 {
          margin: 0;
          font-size: 16px;
          color: rgba(var(--color-foreground), 0.8);
        }

        .upsell-carousel__nav {
          display: flex;
          gap: 8px;
        }

        .upsell-carousel__wrapper {
          display: flex;
          justify-content: flex-start;
        }

        .upsell-carousel__btn {
          background: transparent;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          color: rgba(var(--color-foreground), 0.7);
          flex-shrink: 0;
          transition: color 0.2s ease;
        }

        .upsell-carousel__btn:hover {
          color: rgba(var(--color-foreground), 1);
        }

        .upsell-carousel__btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .upsell-carousel__track {
          overflow: hidden;
          width: 350px;
          margin: 0;
        }

        .upsell-carousel__slides {
          display: flex;
          transition: transform 0.3s ease;
          gap: 12px;
        }

        .upsell-product__item {
          flex: 0 0 auto;
          width: 120px;
          text-align: center;
          padding: 8px;
          border: 1px solid rgba(var(--color-foreground), 0.1);
          border-radius: 8px;
          background-color: rgba(var(--color-background), 1);
        }

        .upsell-product__image {
          width: 104px;
          height: 120px;
          object-fit: contain;
          border-radius: 4px;
          margin-bottom: 10px;
          background-color: rgba(var(--color-foreground), 0.05);
        }

        .upsell-product__title {
          font-size: 1rem;
          line-height: 1.2;
          margin-bottom: 4px;
          color: rgba(var(--color-foreground), 0.9);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .upsell-product__price {
          font-size: 11px;
          color: rgba(var(--color-foreground), 0.7);
          font-weight: 500;
        }
      </style>
    `;

    return { upsellHTML, upsellStyles };
  }

  // Function to initialize upsell functionality
  initializeUpsellFunctionality() {
    if (window.upsellInitialized) return;

    // Create the upsell script functionality
    const script = document.createElement('script');
    script.textContent = `
             // Function to get current cart products
       function getCartProducts() {
         const cartItems = document.querySelectorAll('.cart-item');
         const products = [];
         cartItems.forEach(item => {
           const titleElement = item.querySelector('.cart-item__name');
           const title = titleElement?.textContent?.trim();
           const href = titleElement?.getAttribute('href');
           
           if (title && href) {
             // Extract handle from URL like '/products/product-handle?variant=123'
             const urlParts = href.split('/products/');
             if (urlParts.length > 1) {
               const handlePart = urlParts[1].split('?')[0]; // Remove query parameters
               
               products.push({
                 title: title,
                 handle: handlePart
               });
             }
           }
         });
         return products;
       }

      // Carousel state
      let currentSlide = 0;
      let productsPerView = 2;
      let totalProducts = 0;

      // Function to create product HTML
      function createProductHTML(product) {
        const imageUrl = product.images && product.images.length > 0 ? 'https:' + product.images[0] : '';
        
        // Get currency from global variables (preferring cart currency over shop currency)
        const currency = window.afterpay_cart_currency || window.afterpay_shop_currency || 'USD';
        
        let price = '';
        if (product.variants && product.variants.length > 0) {
          const priceValue = product.variants[0].price / 100;
          const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            currencyDisplay: 'symbol'
          });
          const formatted = formatter.format(priceValue);
          
          // Match Shopify's money_with_currency format: "$140.00 AUD"
          const showCurrencyCode = true; // Based on theme settings
          if (showCurrencyCode && currency !== 'USD' && currency !== 'GBP') {
            const numericPart = formatted.replace(/[^\d.,]/g, '');
            price = \`$\${numericPart} \${currency}\`;
          } else {
            price = formatted;
          }
        }

        return \`
          <div class="upsell-product__item">
            <a href="/products/\${product.handle}">
              <img class="upsell-product__image" src="\${imageUrl}" alt="\${product.title}" loading="lazy">
              <div class="upsell-product__title">\${product.title}</div>
              <div class="upsell-product__price">\${price}</div>
            </a>
          </div>
        \`;
      }

      // Function to update carousel with multiple products
      function updateProductCarousel(relatedProducts) {
        const productCard = document.querySelector('#Upsell-Product');
        const slidesContainer = document.querySelector('#upsell-carousel-slides');
        
        if (productCard && slidesContainer && relatedProducts.length > 0) {
          productCard.style.display = '';

          const productsHTML = relatedProducts.map(product => createProductHTML(product)).join('');
          slidesContainer.innerHTML = productsHTML;

          totalProducts = relatedProducts.length;
          currentSlide = 0;
          updateCarouselButtons();
          updateCarouselPosition();

          // Scroll to upsell section
          const attemptScroll = () => {
            const cartDrawer = document.querySelector('cart-drawer');
            if (cartDrawer) {
              cartDrawer.style.setProperty('max-height', '100vh', 'important');
              cartDrawer.style.setProperty('overflow-y', 'auto', 'important');
              cartDrawer.style.setProperty('height', '100vh', 'important');
            }
            
            const drawerInner = document.querySelector('.drawer__inner');
            if (drawerInner) {
              drawerInner.style.setProperty('max-height', '100vh', 'important');
              drawerInner.style.setProperty('overflow-y', 'auto', 'important');
              drawerInner.style.setProperty('height', '100vh', 'important');
            }
            
            if (productCard) {
              productCard.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
          };
          
          setTimeout(attemptScroll, 500);
          setTimeout(attemptScroll, 1000);
        }
      }

      // Function to update carousel position
      function updateCarouselPosition() {
        const slidesContainer = document.querySelector('#upsell-carousel-slides');
        if (slidesContainer) {
          const slideWidth = 132;
          const offset = currentSlide * slideWidth;
          slidesContainer.style.transform = \`translateX(-\${offset}px)\`;
        }
      }

      // Function to update button states
      function updateCarouselButtons() {
        const prevBtn = document.querySelector('.upsell-carousel__btn--prev');
        const nextBtn = document.querySelector('.upsell-carousel__btn--next');
        
        if (prevBtn && nextBtn) {
          prevBtn.disabled = currentSlide <= 0;
          nextBtn.disabled = currentSlide >= totalProducts - productsPerView;
        }
      }

             // Function to fetch and update related products
       function fetchAndUpdateRelatedProducts() {
         return new Promise((resolve, reject) => {
           const cartProducts = getCartProducts();
           const firstCartItem = cartProducts[0];
           
           if (!firstCartItem) {
             const upsellSection = document.querySelector('#Upsell-Product');
             if (upsellSection) {
               upsellSection.style.display = 'none';
             }
             return resolve();
           }

           // First get the product details to get the product ID
           fetch(\`/products/\${firstCartItem.handle}.js\`)
             .then(response => response.json())
             .then(productData => {
               const productId = productData.id;
               
               // Now get related products using the product ID
               return fetch(\`/recommendations/products.json?product_id=\${productId}&limit=12&intent=related\`);
             })
             .then(response => response.json())
             .then(data => {
               const relatedProducts = data.products
                 .filter(product => !cartProducts.some(cartItem => cartItem.handle === product.handle))
                 .slice(0, 10);

               if (relatedProducts.length > 0) {
                 updateProductCarousel(relatedProducts);
               } else {
                 const upsellSection = document.querySelector('#Upsell-Product');
                 if (upsellSection) {
                   upsellSection.style.display = 'none';
                 }
               }
               resolve();
             })
             .catch(error => {
               console.error('Error fetching related products:', error);
               reject(error);
             });
         });
       }

      // Initialize upsell functionality
      fetchAndUpdateRelatedProducts();

      // Event listeners for carousel navigation
      document.addEventListener('click', function(event) {
        if (event.target.closest('.upsell-carousel__btn--prev')) {
          event.preventDefault();
          event.stopPropagation();
          if (currentSlide > 0) {
            currentSlide--;
            updateCarouselPosition();
            updateCarouselButtons();
          }
        } else if (event.target.closest('.upsell-carousel__btn--next')) {
          event.preventDefault();
          event.stopPropagation();
          if (currentSlide < totalProducts - productsPerView) {
            currentSlide++;
            updateCarouselPosition();
            updateCarouselButtons();
          }
        }
      });

      // Export function for external use
      window.refreshUpsellSection = fetchAndUpdateRelatedProducts;
    `;

    document.head.appendChild(script);
    window.upsellInitialized = true;
  }

  onCartUpdate() {
    if (this.tagName === 'CART-DRAWER-ITEMS') {
      return fetch(`${routes.cart_url}?section_id=cart-drawer`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const selectors = ['cart-drawer-items', '.cart-drawer__footer'];

          // Check if cart was previously empty
          const wasEmpty = this.classList.contains('is-empty');

          for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);
            if (targetElement && sourceElement) {
              targetElement.replaceWith(sourceElement);
            }
          }

          // Handle upsell section creation and updates
          const cartItemsTable = document.querySelector('.cart-items tbody');
          const upsellSection = document.querySelector('#Upsell-Product');
          const hasCartItems = cartItemsTable && document.querySelectorAll('.cart-item').length > 0;

          if (hasCartItems && !upsellSection) {
            // Create and inject the upsell section (handles both empty->filled and initial load cases)
            const { upsellHTML, upsellStyles } = this.createUpsellSection();

            // Add styles if not already present
            if (!document.querySelector('#upsell-dynamic-styles')) {
              document.head.insertAdjacentHTML('beforeend', upsellStyles);
            }

            // Add upsell row to the table
            cartItemsTable.insertAdjacentHTML('beforeend', upsellHTML);

            // Initialize upsell functionality
            this.initializeUpsellFunctionality();
          } else if (hasCartItems && upsellSection && window.refreshUpsellSection) {
            // Cart has items and upsell section exists, just refresh it
            window.refreshUpsellSection();
          } else if (!hasCartItems && upsellSection) {
            // Cart is empty, hide upsell section
            upsellSection.style.display = 'none';
          }

          // Update progress bar after cart update
          this.updateProgressBar(window.cart.total_price, window.cart.item_count);
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      return fetch(`${routes.cart_url}?section_id=main-cart-items`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const sourceQty = html.querySelector('cart-items');
          this.innerHTML = sourceQty.innerHTML;
          // Update progress bar after cart update
          this.updateProgressBar(window.cart.total_price, window.cart.item_count);
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section',
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents',
      },
    ];
  }

  updateQuantity(line, quantity, event, name, variantId) {
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });
    const eventTarget = event.currentTarget instanceof CartRemoveButton ? 'clear' : 'change';

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);

        CartPerformance.measure(`${eventTarget}:paint-updated-sections"`, () => {
          const quantityElement =
            document.getElementById(`Quantity-${line}`) || document.getElementById(`Drawer-quantity-${line}`);
          const items = document.querySelectorAll('.cart-item');

          if (parsedState.errors) {
            quantityElement.value = quantityElement.getAttribute('value');
            this.updateLiveRegions(line, parsedState.errors);
            return;
          }

          this.classList.toggle('is-empty', parsedState.item_count === 0);
          const cartDrawerWrapper = document.querySelector('cart-drawer');
          const cartFooter = document.getElementById('main-cart-footer');

          if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
          if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);

          this.getSectionsToRender().forEach((section) => {
            const elementToReplace =
              document.getElementById(section.id).querySelector(section.selector) ||
              document.getElementById(section.id);
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              section.selector
            );
          });
          const updatedValue = parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
          let message = '';
          if (items.length === parsedState.items.length && updatedValue !== parseInt(quantityElement.value)) {
            if (typeof updatedValue === 'undefined') {
              message = window.cartStrings.error;
            } else {
              message = window.cartStrings.quantityError.replace('[quantity]', updatedValue);
            }
          }
          this.updateLiveRegions(line, message);

          const lineItem =
            document.getElementById(`CartItem-${line}`) || document.getElementById(`CartDrawer-Item-${line}`);
          if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
            cartDrawerWrapper
              ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`))
              : lineItem.querySelector(`[name="${name}"]`).focus();
          } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
            trapFocus(cartDrawerWrapper.querySelector('.drawer__inner-empty'), cartDrawerWrapper.querySelector('a'));
          } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
            trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name'));
          }
        });

        CartPerformance.measureFromEvent(`${eventTarget}:user-action`, event);

        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: parsedState, variantId: variantId });
      })
      .catch(() => {
        this.querySelectorAll('.loading__spinner').forEach((overlay) => overlay.classList.add('hidden'));
        const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
        errors.textContent = window.cartStrings.error;
      })
      .finally(() => {
        this.disableLoading(line);
      });
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
    if (lineItemError) lineItemError.querySelector('.cart-item__error-text').textContent = message;

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus =
      document.getElementById('cart-live-region-text') || document.getElementById('CartDrawer-LiveRegionText');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.add('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => overlay.classList.remove('hidden'));

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.remove('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    cartDrawerItemElements.forEach((overlay) => overlay.classList.add('hidden'));
  }
}

customElements.define('cart-items', CartItems);

if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          'input',
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } }).then(() =>
              CartPerformance.measureFromEvent('note-update:user-action', event)
            );
          }, ON_CHANGE_DEBOUNCE_TIMER)
        );
      }
    }
  );
}

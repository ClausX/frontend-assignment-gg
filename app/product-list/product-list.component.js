'use strict';

angular.
  module('productListApp').
  component('productList', {
    templateUrl: 'product-list/product-list.template.html',
    controller: ['$scope', function ProductListController($scope) {
        var self = this;
        self.productTree;
        self.allProducts = [];
        self.productCategories = [
            {id: "", name: "All Products"},
            {id: "s04", name: "Slang & Kabelupprullare"}, 
            {id: "s0405", name: "- Avfettning"}, 
            {id: "s0406", name: "- Avspärrning"},
            {id: "s0407", name: "- Butan/Propan"}
        ]; // Dynamic?
        self.productCategory = '';
        self.displayProducts = [];
        self.pages = [1];
        self.currentPaginationPages = self.pages;
        self.orderProp = "name";
        self.pageNumber = 1;
        self.productsPerPage = "5";
        self.isLoading = true;

        
        // Get data _____________________

        const getAlot = false;
        
        if (getAlot) {
            window.getAlotOfCategories(response => { // This exists in order to try getAlotOfCategories and does its own thing atm
                self.productTree = response;
                getProductIds(response).then(data => {
                    for (let i = 0; i < 1234; i++) {
                        window.getRandomProduct(data[i], response => {
                            self.allProducts.push(pushProductInfo(response));
                            self.displayProducts.push(pushProductInfo(response));
                            $scope.$apply();
                        });
                    }
                    self.isLoading = false; 
                });
            });
        } else {
            window.getCategories(response => {
                self.productTree = response;
                initialDisplayProducts(response);
            });
        }

        // Functions ____________________

        async function initialDisplayProducts(response){
            self.allProducts = await setDisplayProducts(response);
        }

        function setDisplayProducts(productsToDisplay) {
            return new Promise(resolve => {
                getProductIds(productsToDisplay).then(data => {
                    let products = [];
                    let promises = [];
                    for (let id of data) {
                        promises.push(new Promise(resolve => {
                            window.getProduct(id, response => {
                                products.push(pushProductInfo(response));
                                resolve(id);
                            })
                        }));
                    }
                    Promise.all(promises).then(() => {
                        self.displayProducts = products;
                        self.isLoading = false;
                        $scope.$apply();
                        resolve(products);
                    });
                });
            });
        }
    
        function getProductIds(products) {
            return new Promise(resolve => {
                let productIds = getProductsOfNode(products, []);
                resolve(productIds);
            });
        }

        function pushProductInfo(product) {
            return {
                name: product.name,
                id: product.id,
                price: product.extra.AGA.PRI,
                stock: product.extra.AGA.LGA > 0,
                volume: product.extra.AGA.VOL
            };
        }

        function getProductsOfNode(node, products) {
            if (node.id[0] === 's') {
                if (node.children.length > 0) {
                    for (let child of node.children) {
                        products = getProductsOfNode(child, products);
                    }
                }
            } else {
                products.push(node.id);
            }
            return products;
        }
        
        function findAndDisplayCategory(node, category) {
            if (node.id[0] === 's') {
                if (node.id === category) {                    
                    setDisplayProducts(node);
                    return true;
                } else if (node.children.length > 0) {
                    for (let child of node.children) {
                        const categoryFound = findAndDisplayCategory (child, category);
                        if (categoryFound) { return categoryFound; }
                    }
                }
            }

            return false;
        }

        function updatePageAmount(length, productsPerPage) {
            self.pages = Array(Math.ceil(length / productsPerPage))
            .fill().map((x,i)=>i+1);
            if (self.pageNumber > self.pages.length) {
                self.pageNumber = self.pages.length;
            }
        }

        function updateDisplayProducts(category) {
            self.isLoading = true;
            if (category === '') {
                self.displayProducts = self.allProducts;
                self.isLoading = false;
            } else {
                findAndDisplayCategory(self.productTree, category);
            }
        }

        function updateCurrentPaginationPages(currentPage) {
            self.currentPaginationPages= [currentPage];
            if (currentPage - 1 > 0) {
                self.currentPaginationPages.unshift(currentPage-1);
                
                if (currentPage - 2 > 0) {
                    self.currentPaginationPages.unshift(currentPage-2);
                }
            }

            if (currentPage + 1 <= self.pages.length) {
                self.currentPaginationPages.push(currentPage+1);

                if (currentPage + 2 <= self.pages.length){
                    self.currentPaginationPages.push(currentPage+2);
                }
            }
        }

        
        self.onPaginationClick = function(action) {
            if (typeof action === "string") { // These strings could be from an ENUM object or something
                if (action === 'first') {
                    action = 1;
                } else if (action === 'previous') {
                    stepPageNumber(-1);
                } else if (action === 'next') {
                    stepPageNumber(1);
                } else if (action === 'last') {
                    action = self.pages.length;
                }
            } 
            setPageNumber(action);
        }
        
        function setPageNumber(number) {
            if (number <= 0) {
                self.pageNumber = 1;
            } else if (number <= self.pages.length) {
                self.pageNumber = number;
            }
        }

        function stepPageNumber(number) {
            if (number < 0) {
                setPageNumber(self.pageNumber-1);
            } else {
                setPageNumber(self.pageNumber+1);
            }
        }

        // Filters & table controllers __

        self.filterPrice = function(product) {
            return self.filterOnVolume(self.maxPrice, self.minPrice, product.price);
        }

        self.filterVolume = function(product) { 
            return self.filterOnVolume(self.maxVolume, self.minVolume, product.volume);
        };

        self.filterOnVolume = function (inMaxValue, inMinValue, productValue) {
            const maxValue = self.floatifyValue(inMaxValue ? inMaxValue : Number.MAX_SAFE_INTEGER);
            const minValue = self.floatifyValue(inMinValue ? inMinValue : 0);
            const value = Number(productValue);
            
            return (value <= maxValue && value >= minValue);
        }

        self.floatifyValue = function (value) {
            if (typeof value != 'number') {
                value = parseFloat(value);
            }
            return value;
        }

        self.changeOrderProp = function(orderBy) {
            console.log(orderBy, orderBy === self.orderProp);
            if (orderBy === self.orderProp) {
                self.orderProp = "-" + orderBy;
            } else {
                self.orderProp = orderBy;
            }
        }
        
        // Watchers _____________________

        $scope.$watch('$ctrl.displayProducts', (newValue, oldValue) => { // slow to always watch?
            if(newValue != oldValue){
                updatePageAmount(newValue.length, self.productsPerPage);
            }
        }, true);

        $scope.$watch('$ctrl.productsPerPage', (newValue, oldValue) => {
            if(newValue != oldValue){
                updatePageAmount(self.displayProducts.length, newValue);
            }
        }, true);

        $scope.$watch('$ctrl.productCategory', (newValue, oldValue) => {
            if (newValue != oldValue) {
                updateDisplayProducts(newValue);
            }
        });

        $scope.$watch('$ctrl.pages', (newValue, oldValue) => {
            if (newValue != oldValue) {
                updateCurrentPaginationPages(self.pageNumber);
            }
        });

        $scope.$watch('$ctrl.pageNumber', (newValue, oldValue) => {
            if (newValue != oldValue) {
                updateCurrentPaginationPages(self.pageNumber);
            }
        });
    }]
  });

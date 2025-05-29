const fs = require('fs');
const { 
    formatImgUrls, 
    formatKeywords, 
    formatIngredients, 
    convertRecipeToFood,
    validateRecipe,
    analyzeJsonFile
} = require('./importFoods');

function testDataCleaning() {
    console.log('=== Testing Data Cleaning Functions ===\n');
    
    console.log('1. Testing formatImgUrls:');
    const testImages = [
        'https://example.com/image.jpg',
        'c("https://img1.com/a.jpg", "https://img2.com/b.jpg")',
        'c("https://img.sndimg.com/food/image/upload/w_555,h_416,c_fit,fl_progressive,q_95/v1/img/recipes/38/YUeirxMLQaeE1h3v3qnM_229%20berry%20blue%20frzn%20dess.jpg")',
        null,
        ''
    ];
    
    testImages.forEach((img, i) => {
        const result = formatImgUrls(img);
        console.log(`   Input ${i+1}: ${img}`);
        console.log(`   Output: ${result}\n`);
    });
    
    console.log('2. Testing formatKeywords:');
    const testKeywords = [
        'c("Dessert", "Low Protein", "Low Cholesterol", "Healthy")',
        'Single Keyword',
        'c("Breakfast")',
        null,
        ''
    ];
    
    testKeywords.forEach((keyword, i) => {
        const result = formatKeywords(keyword);
        console.log(`   Input ${i+1}: ${keyword}`);
        console.log(`   Output: ${JSON.stringify(result)}\n`);
    });
    
    console.log('3. Testing formatIngredients:');
    const testIngredients = [
        'c("blueberries", "granulated sugar", "vanilla yogurt", "lemon juice")',
        'Single Ingredient',
        null,
        ''
    ];
    
    testIngredients.forEach((ingredient, i) => {
        const result = formatIngredients(ingredient);
        console.log(`   Input ${i+1}: ${ingredient}`);
        console.log(`   Output: ${JSON.stringify(result)}\n`);
    });
}

function testRecipeValidation() {
    console.log('=== Testing Recipe Validation ===\n');
    
    const testRecipes = [
        {
            "RecipeId": 38,
            "Name": "Low-Fat Berry Blue Frozen Dessert",
            "Images": "https://img.sndimg.com/food/image/upload/test.jpg",
            "Calories": 42.725,
            "RecipeServings": 4.0
        },
        {
            "RecipeId": 39,
            "Name": "Another Recipe",
            "Images": null,
            "Calories": 100,
            "RecipeServings": 2.0
        },
        {
            "RecipeId": 40,
            "Name": "",
            "Images": "https://example.com/image.jpg",
            "Calories": 150,
            "RecipeServings": 1.0
        },
        {
            "RecipeId": 41,
            "Name": "Test Recipe",
            "Images": "https://example.com/image.jpg",
            "Calories": 0,
            "RecipeServings": 2.0
        },
        {
            "RecipeId": 42,
            "Name": "Another Test",
            "Images": "https://example.com/image.jpg",
            "Calories": 200,
            "RecipeServings": 0
        }
    ];
    
    testRecipes.forEach((recipe, i) => {
        console.log(`--- Test Recipe ${i + 1} ---`);
        console.log(`Name: ${recipe.Name}`);
        console.log(`Image: ${recipe.Images}`);
        console.log(`Calories: ${recipe.Calories}`);
        console.log(`Servings: ${recipe.RecipeServings}`);
        
        const errors = validateRecipe(recipe);
        if (errors.length === 0) {
            console.log('✅ Status: VALID - Will be imported');
        } else {
            console.log('❌ Status: INVALID - Will be skipped');
            console.log('   Errors:', errors.join(', '));
        }
        console.log('');
    });
}

function testRecipeConversion() {
    console.log('=== Testing Recipe Conversion ===\n');
    
    const testRecipe = {
        "RecipeId": 38,
        "Name": "Low-Fat Berry Blue Frozen Dessert",
        "CookTime": 1440,
        "PrepTime": 45,
        "TotalTime": 1485,
        "RecipeIngredientParts": "c(\"blueberries\", \"granulated sugar\", \"vanilla yogurt\", \"lemon juice\")",
        "Calories": 42.725,
        "FatContent": 0.625,
        "SaturatedFatContent": 0.325,
        "CholesterolContent": 2.0,
        "SodiumContent": 7.45,
        "CarbohydrateContent": 9.275,
        "FiberContent": 0.9,
        "SugarContent": 7.55,
        "ProteinContent": 0.8,
        "RecipeServings": 4.0,
        "Keywords": "c(\"Dessert\", \"Low Protein\", \"Low Cholesterol\", \"Healthy\", \"Free Of...\", \"Summer\", \"Weeknight\", \"Freezer\", \"Easy\")",
        "Images": "https://img.sndimg.com/food/image/upload/w_555,h_416,c_fit,fl_progressive,q_95/v1/img/recipes/38/YUeirxMLQaeE1h3v3qnM_229%20berry%20blue%20frzn%20dess.jpg",
        "Cuisine": "Other",
        "MealType": "Snack",
        "DietType": [
            "Low Calorie",
            "High Protein",
            "Special Diets"
        ]
    };
    
    const converted = convertRecipeToFood(testRecipe);
    console.log('Converted recipe:');
    console.log(JSON.stringify(converted, null, 2));
}

function showFilteredRecipes(filePath, limit = 10) {
    console.log(`=== Recipes That Will Be Filtered Out (Limit: ${limit}) ===\n`);
    
    try {
        const jsonData = fs.readFileSync(filePath, 'utf8');
        const recipes = JSON.parse(jsonData);
        
        let filteredCount = 0;
        let shownCount = 0;
        
        for (let i = 0; i < recipes.length && shownCount < limit; i++) {
            const recipe = recipes[i];
            const errors = validateRecipe(recipe);
            
            if (errors.length > 0) {
                filteredCount++;
                if (shownCount < limit) {
                    console.log(`--- Filtered Recipe ${shownCount + 1} (Index: ${i}) ---`);
                    console.log(`Name: ${recipe.Name || 'NO NAME'}`);
                    console.log(`Image: ${recipe.Images || 'NO IMAGE'}`);
                    console.log(`Calories: ${recipe.Calories || 'NO CALORIES'}`);
                    console.log(`Servings: ${recipe.RecipeServings || 'NO SERVINGS'}`);
                    console.log(`Reasons: ${errors.join(', ')}`);
                    console.log('');
                    shownCount++;
                }
            }
        }
        
        console.log(`Total filtered recipes: ${filteredCount}`);
        console.log(`Showing first ${shownCount} filtered recipes\n`);
        
    } catch (error) {
        console.error('Error reading file:', error.message);
    }
}

function previewValidRecipes(filePath, limit = 5) {
    console.log(`=== Valid Recipes Preview (Limit: ${limit}) ===\n`);
    
    try {
        const jsonData = fs.readFileSync(filePath, 'utf8');
        const recipes = JSON.parse(jsonData);
        
        let validCount = 0;
        let shownCount = 0;
        
        for (let i = 0; i < recipes.length && shownCount < limit; i++) {
            const recipe = recipes[i];
            const errors = validateRecipe(recipe);
            
            if (errors.length === 0) {
                validCount++;
                if (shownCount < limit) {
                    console.log(`--- Valid Recipe ${shownCount + 1} (Original Index: ${i}) ---`);
                    console.log(`Name: ${recipe.Name}`);
                    console.log(`Image: ${recipe.Images ? 'Available' : 'Missing'}`);
                    console.log(`Calories: ${recipe.Calories}`);
                    console.log(`Servings: ${recipe.RecipeServings}`);
                    
                    const converted = convertRecipeToFood(recipe);
                    console.log('Converted values:');
                    console.log(`   Calories per serving: ${converted.calories_per_serving}`);
                    console.log(`   Protein per serving: ${converted.protein_per_serving}g`);
                    console.log(`   Carbs per serving: ${converted.carbs_per_serving}g`);
                    console.log(`   Fat per serving: ${converted.fat_per_serving}g`);
                    console.log(`   Keywords: ${converted.recipe_metadata.keywords.length} items`);
                    console.log(`   Ingredients: ${converted.recipe_metadata.ingredients.length} items`);
                    console.log('');
                    shownCount++;
                }
            }
        }
        
        console.log(`Total valid recipes found: ${validCount}`);
        console.log(`Showing first ${shownCount} valid recipes\n`);
        
    } catch (error) {
        console.error('Error reading file:', error.message);
    }
}

function generateImportPlan(filePath, batchSize = 100) {
    console.log(`=== Import Plan (Batch Size: ${batchSize}) ===\n`);
    
    try {
        const jsonData = fs.readFileSync(filePath, 'utf8');
        const recipes = JSON.parse(jsonData);
        
        let validRecipes = [];
        for (let i = 0; i < recipes.length; i++) {
            const recipe = recipes[i];
            const errors = validateRecipe(recipe);
            if (errors.length === 0) {
                validRecipes.push({
                    originalIndex: i,
                    recipe: recipe
                });
            }
        }
        
        const totalValid = validRecipes.length;
        const totalBatches = Math.ceil(totalValid / batchSize);
        
        console.log(`Total recipes in file: ${recipes.length}`);
        console.log(`Valid recipes (with images): ${totalValid}`);
        console.log(`Invalid/filtered recipes: ${recipes.length - totalValid}`);
        console.log(`Recommended batch size: ${batchSize}`);
        console.log(`Total batches needed: ${totalBatches}\n`);
        
        console.log('=== IMPORT COMMANDS ===');
        for (let batch = 0; batch < totalBatches; batch++) {
            const startIndex = batch * batchSize;
            const endIndex = Math.min(startIndex + batchSize - 1, totalValid - 1);
            const batchCount = endIndex - startIndex + 1;
            
            console.log(`# Batch ${batch + 1}/${totalBatches} (${batchCount} recipes)`);
            console.log(`node importFoods.js import-batch ${filePath} ${startIndex} ${batchSize}`);
            console.log('');
        }
        
        console.log('=== ADDITIONAL COMMANDS ===');
        console.log(`# Check progress`);
        console.log(`node importFoods.js progress ${filePath}`);
        console.log('');
        console.log(`# Clear all data (if needed)`);
        console.log(`node importFoods.js clear`);
        console.log('');
        
        return {
            totalRecipes: recipes.length,
            validRecipes: totalValid,
            invalidRecipes: recipes.length - totalValid,
            totalBatches: totalBatches,
            batchSize: batchSize
        };
        
    } catch (error) {
        console.error('Error generating import plan:', error.message);
    }
}

function main() {
    const command = process.argv[2];
    const filePath = process.argv[3];
    
    switch (command) {
        case 'test-cleaning':
            testDataCleaning();
            break;
            
        case 'test-validation':
            testRecipeValidation();
            break;
            
        case 'test-conversion':
            testRecipeConversion();
            break;
            
        case 'analyze':
            if (!filePath) {
                console.error('Usage: node testImport.js analyze <json-file-path>');
                process.exit(1);
            }
            analyzeJsonFile(filePath);
            break;
            
        case 'preview-valid':
            if (!filePath) {
                console.error('Usage: node testImport.js preview-valid <json-file-path> [count]');
                process.exit(1);
            }
            const validLimit = parseInt(process.argv[4]) || 5;
            previewValidRecipes(filePath, validLimit);
            break;
            
        case 'preview-filtered':
            if (!filePath) {
                console.error('Usage: node testImport.js preview-filtered <json-file-path> [count]');
                process.exit(1);
            }
            const filteredLimit = parseInt(process.argv[4]) || 10;
            showFilteredRecipes(filePath, filteredLimit);
            break;
            
        case 'plan':
            if (!filePath) {
                console.error('Usage: node testImport.js plan <json-file-path> [batch-size]');
                process.exit(1);
            }
            const batchSize = parseInt(process.argv[4]) || 100;
            generateImportPlan(filePath, batchSize);
            break;
            
        default:
            console.log('Usage: node testImport.js <command> [options]');
            console.log('');
            console.log('Commands:');
            console.log('  test-cleaning                        Test data cleaning functions');
            console.log('  test-validation                      Test recipe validation');
            console.log('  test-conversion                      Test recipe conversion');
            console.log('  analyze <file>                       Analyze JSON file (same as importFoods.js)');
            console.log('  preview-valid <file> [count]         Preview valid recipes that will be imported');
            console.log('  preview-filtered <file> [count]      Show recipes that will be filtered out');
            console.log('  plan <file> [batch-size]             Generate import plan with commands');
            console.log('');
            console.log('Examples:');
            console.log('  node testImport.js test-cleaning');
            console.log('  node testImport.js analyze ./data/recipes.json');
            console.log('  node testImport.js preview-valid ./data/recipes.json 10');
            console.log('  node testImport.js preview-filtered ./data/recipes.json 5');
            console.log('  node testImport.js plan ./data/recipes.json 50');
            break;
    }
}

if (require.main === module) {
    main();
}
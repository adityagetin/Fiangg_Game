// Define slot values for different rewards
const slotValues = [
    'static/01.png', // Cashback
    'static/02.png', // ROI Discount
    'static/03.png'  // Subscription Discount
];

// Maximum number of spins allowed
let spinCount = 0;
const maxSpins = 3;

// Wallet balances for different types of rewards
let cashbackBalance = 0;
let roiBalance = 0;
let subscriptionBalance = 0;

// Preload and set up the spin sound
const spinSound = new Audio('static/sound1.mp3');
spinSound.loop = true; // Set sound to loop

// Utility function to get a random integer between min and max (inclusive)
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Utility function to get a random slot value
function getRandomSlotValue() {
    return slotValues[Math.floor(Math.random() * slotValues.length)];
}

// Function to get jackpot result and update only the relevant wallet balance
function getJackpotResult(value) {
    let result = '';
    switch (value) {
        case 'static/01.png': // Cashback reward
            const cashback = getRandomInt(20, 500);
            cashbackBalance += cashback;
            result = `Cashback of Rs ${cashback}`;
            updateWallets('cashback');
            break;
        case 'static/02.png': // ROI Discount reward
            const roiDiscount = getRandomInt(1, 2) / 100;
            roiBalance += roiDiscount;
            result = `ROI Discount of ${roiDiscount}%`;
            updateWallets('roi');
            break;
        case 'static/03.png': // Subscription Discount reward
            const subscriptionDiscount = getRandomInt(100, 2000);
            subscriptionBalance += subscriptionDiscount;
            result = `Subscription Discount of Rs ${subscriptionDiscount}`;
            updateWallets('subscription');
            break;
        default:
            result = 'Try again!';
            break;
    }
    return result;
}

// Function to update only the relevant wallet display
function updateWallets(type) {
    if (type === 'cashback') {
        document.getElementById('cashbackAmount').textContent = `${cashbackBalance}/-`;
    } else if (type === 'roi') {
        document.getElementById('roiAmount').textContent = `${Number(roiBalance).toFixed(2)}`;
    } else if (type === 'subscription') {
        document.getElementById('subscriptionAmount').textContent = `${subscriptionBalance}/-`;
    }
    updateWalletsInDatabase(type);
}

// Update only the relevant wallet balances in the database
function updateWalletsInDatabase(type) {
    let data = {};

    // Update only the affected wallet in the database
    if (type === 'cashback') {
        data = { cashback: cashbackBalance };
    } else if (type === 'roi') {
        data = { roi: roiBalance };
    } else if (type === 'subscription') {
        data = { subscription: subscriptionBalance };
    }

    // Send update request to the server
    fetch('/update_wallet_balances', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(fetchWalletBalances); // Fetch updated balances after updating
}

// Function to fetch wallet balances from the database on page load
function fetchWalletBalances() {
    fetch('/get_wallet_balances')
        .then(response => response.json())
        .then(data => {
            cashbackBalance = data.cashback;
            roiBalance = data.roi;
            subscriptionBalance = data.subscription;
            // Update the UI with the fetched balances
            updateWalletsDisplay();
        });
}

// Function to update the wallet balances display on the UI
function updateWalletsDisplay() {
    document.getElementById('cashbackAmount').textContent = `${cashbackBalance}/-`;
    document.getElementById('roiAmount').textContent = `${Number(roiBalance).toFixed(2)}`;
    document.getElementById('subscriptionAmount').textContent = `${subscriptionBalance}/-`;
}

// Main function to handle the spinning action
function spin() {
    if (spinCount < maxSpins) {

    // Play sound when spin starts
        spinSound.play();

        spinCount++;
        const slots = document.querySelectorAll('.slot-content');
        const resultDisplay = document.getElementById('result');

        // Calculate spin duration and number of spins
        const spins = getRandomInt(10, 20);
        const duration = 5; // Duration in seconds
        const totalRotation = spins * 360; // Total degrees to rotate
        const iconChangeInterval = 100; // Interval to change icons in milliseconds

        // Set initial icons
        slots.forEach(slot => {
            slot.innerHTML = `<img src="${getRandomSlotValue()}" alt="Reward"/>`;
        });

        // Start spinning animation
        slots.forEach(slot => {
            slot.style.transition = `transform ${duration}s cubic-bezier(0.17, 0.67, 0.83, 0.67)`;
            slot.style.transform = `rotateX(${totalRotation}deg)`;
        });

        // Change icons during spinning
        const intervalId = setInterval(() => {
            slots.forEach(slot => {
                slot.innerHTML = `<img src="${getRandomSlotValue()}" alt="Reward"/>`;
            });
        }, iconChangeInterval);

        // Stop changing icons and determine result after spinning
        setTimeout(() => {
            clearInterval(intervalId); // Stop changing icons

            const results = [];
            slots.forEach(slot => {
                const value = getRandomSlotValue();
                slot.innerHTML = `<img src="${value}" alt="Reward"/>`;
                results.push(value);
            });

            // Stop the sound when result is declared
            spinSound.pause();
            spinSound.currentTime = 0; // Reset sound playback

            // Determine the result
            if (new Set(results).size === 1) {
                resultDisplay.innerHTML = `Congratulations! You Win <br> ${getJackpotResult(results[0])}!`;
            } else {
                resultDisplay.innerHTML = `Try again!`;
            }

            // Reset rotation
            slots.forEach(slot => {
                slot.style.transition = 'none';
                slot.style.transform = 'none';
            });

            // Update spin button text
            if (spinCount < maxSpins) {
                document.getElementById('spinButton').textContent = `Spin ${spinCount + 1}/${maxSpins}`;
            } else {
                document.getElementById('spinButton').textContent = "Game Over";
                document.getElementById('spinButton').disabled = true;
                if (cashbackBalance === 0 && roiBalance === 0 && subscriptionBalance === 0) {
                    resultDisplay.innerHTML = 'Better Luck Next Time!';
                }
            }
        }, duration * 1000); // Match the duration in milliseconds
    }
}

// Fetch wallet balances when the page loads
document.addEventListener('DOMContentLoaded', fetchWalletBalances);

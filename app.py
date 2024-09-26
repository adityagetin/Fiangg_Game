from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from datetime import datetime, timedelta
import pyodbc

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Required for session management

# Database connection details
server = 'ADITYA-PAL'  # Replace with your actual server name or IP address
database = 'Finagg'
driver = '{ODBC Driver 17 for SQL Server}'


def get_db_connection():
    # Properly format the connection string
    conn_str = f'DRIVER={driver};SERVER={server};DATABASE={database};Trusted_Connection=yes;'
    return pyodbc.connect(conn_str)


@app.route('/')
def index():
    if 'mob_no' not in session:
        return redirect(url_for('login'))
    mob_no = session['mob_no']
    return render_template('index.html', mob_no=mob_no)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        mob_no = request.form['mob_no']
        otp = request.form['otp']

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT Last_Login FROM Game WHERE Mob_No = ?", (mob_no,))
            result = cursor.fetchone()

            if result:
                last_login = result[0]
                current_time = datetime.now()

                time_difference = current_time - last_login

                if time_difference < timedelta(hours=1):
                    flash('You cannot log in right now. Please wait at least 1 hour from your last login.')
                    return redirect(url_for('login'))

                else:
                    cursor.execute("UPDATE Game SET Last_Login = ? WHERE Mob_No = ?", (current_time, mob_no))
                    conn.commit()

                    if otp == mob_no[-4:]:
                        flash('Login successful!')
                        session['mob_no'] = mob_no
                        return redirect(url_for('index'))
                    else:
                        flash('Incorrect OTP. Please try again.')
                        return redirect(url_for('login'))
            else:
                flash('Mobile number not found.')
                return redirect(url_for('login'))
        except pyodbc.Error as e:
            flash(f"Database error: {e}")
            return redirect(url_for('login'))
        finally:
            conn.close()

    return render_template('login.html')

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('mob_no', None)  # Remove user from session
    return redirect(url_for('login'))


@app.route('/get_wallet_balances', methods=['GET'])
def get_wallet_balances():
    if 'mob_no' not in session:
        return redirect(url_for('login'))
    mob_no = session['mob_no']
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT Cashback, RoI, Sub_Discount FROM Game WHERE Mob_No = ?", (mob_no,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return jsonify({'cashback': row[0], 'roi': row[1], 'subscription': row[2]})
        return jsonify({'cashback': 0, 'roi': 0, 'subscription': 0})
    except pyodbc.Error as e:
        return jsonify({'error': f"Database error: {e}"})


@app.route('/update_wallet_balances', methods=['POST'])
def update_wallet_balances():
    if 'mob_no' not in session:
        return jsonify({'status': 'failed', 'message': 'User not logged in'})

    mob_no = session.get('mob_no')
    data = request.json
    cashback = float(data.get('cashback', 0))  # Ensure these are numbers
    roi = float(data.get('roi', 0))  # Ensure these are numbers
    subscription = float(data.get('subscription', 0))  # Ensure these are numbers

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Only update the relevant balance based on which reward was won
        if cashback > 0:
            cursor.execute("""
                UPDATE Game
                SET Cashback = Cashback + ?
                WHERE Mob_No = ?
            """, (cashback, mob_no))

        if roi > 0:
            cursor.execute("""
                UPDATE Game
                SET RoI = RoI + ?
                WHERE Mob_No = ?
            """, (roi, mob_no))

        if subscription > 0:
            cursor.execute("""
                UPDATE Game
                SET Sub_Discount = Sub_Discount + ?
                WHERE Mob_No = ?
            """, (subscription, mob_no))

        conn.commit()
        conn.close()

        return jsonify({'status': 'success'})
    except pyodbc.Error as e:
        return jsonify({'status': 'failed', 'message': f"Database error: {e}"})


if __name__ == '__main__':
    app.run(debug=True)

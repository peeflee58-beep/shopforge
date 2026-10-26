# recommendation_engine.py
import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder

# 1. Initialize Firebase Admin SDK using your downloaded key file
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

def run_market_basket_analysis():
    print("Fetching live orders from Firestore...")
    
    # 2. Extract transaction history from the live 'orders' collection
    orders_ref = db.collection("orders")
    docs = orders_ref.stream()

    transactions = []
    for doc in docs:
        order = doc.to_dict()
        items = order.get("items", [])
        # Extract product names from each order item
        item_names = [item.get("productName") for item in items if "productName" in item]
        if item_names:
            transactions.append(item_names)

    if not transactions:
        print("No transaction records found yet. Complete a checkout on your website first.")
        return

    print(f"Loaded {len(transactions)} transactions. Running Apriori algorithm...")

    # 3. One-hot encode transactions for data mining
    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    df = pd.DataFrame(te_ary, columns=te.columns_)

    # 4. Apply Apriori algorithm (min_support can be adjusted based on transaction volume)
    frequent_itemsets = apriori(df, min_support=0.05, use_colnames=True)

    if frequent_itemsets.empty:
        print("No frequent itemsets detected under the current support threshold.")
        return

    # 5. Generate association rules based on confidence
    rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=0.2)

    if rules.empty:
        print("No strong association rules found.")
        return

    # 6. Synchronize generated recommendations back to live Firestore
    rec_ref = db.collection("recommendations")
    
    # Clear old recommendations first (optional)
    existing_recs = rec_ref.stream()
    for doc in existing_recs:
        doc.reference.delete()

    for _, row in rules.iterrows():
        antecedents = list(row['antecedents'])
        consequents = list(row['consequents'])
        
        rec_data = {
            "productName": antecedents[0],
            "recommendedProducts": [{"productName": consequents[0], "price": 0}], # You can map exact product details here
            "confidence": float(row['confidence']),
            "support": float(row['support']),
            "lift": float(row['lift'])
        }
        rec_ref.add(rec_data)

    print("Market Basket Analysis complete! Recommendations successfully synced to Firebase.")

if __name__ == "__main__":
    run_market_basket_analysis()
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Store, Users } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function SalesManagement() {
  const [newStore, setNewStore] = useState({
    name: "",
    code: "",
    address: "",
    manager: ""
  });

  const [newSalesPerson, setNewSalesPerson] = useState({
    firstName: "",
    lastName: "",
    employeeId: "",
    email: "",
    currentStoreId: ""
  });

  const { data: stores = [] } = useQuery<any[]>({
    queryKey: ["/api/stores"],
  });

  const { data: salesPersons = [] } = useQuery<any[]>({
    queryKey: ["/api/sales-persons"],
  });

  const createStoreMutation = useMutation({
    mutationFn: async (storeData: any) => {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storeData),
      });
      if (!response.ok) throw new Error("Failed to create store");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      setNewStore({ name: "", code: "", address: "", manager: "" });
    },
  });

  const createSalesPersonMutation = useMutation({
    mutationFn: async (personData: any) => {
      const response = await fetch("/api/sales-persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personData),
      });
      if (!response.ok) throw new Error("Failed to create sales person");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-persons"] });
      setNewSalesPerson({ firstName: "", lastName: "", employeeId: "", email: "", currentStoreId: "" });
    },
  });

  const handleStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createStoreMutation.mutate(newStore);
  };

  const handleSalesPersonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const personData = {
      ...newSalesPerson,
      currentStoreId: newSalesPerson.currentStoreId ? parseInt(newSalesPerson.currentStoreId) : null,
      employeeId: newSalesPerson.employeeId || null
    };
    createSalesPersonMutation.mutate(personData);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Sales Team Management</h1>
        <p className="text-muted-foreground">
          Manage your stores and sales persons for accurate attribution and analytics
        </p>
      </div>

      <Tabs defaultValue="stores" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stores" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Stores
          </TabsTrigger>
          <TabsTrigger value="sales-persons" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Sales Persons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stores" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New Store
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleStoreSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="storeName">Store Name *</Label>
                    <Input
                      id="storeName"
                      value={newStore.name}
                      onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                      placeholder="Main Store"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="storeCode">Store Code</Label>
                    <Input
                      id="storeCode"
                      value={newStore.code}
                      onChange={(e) => setNewStore({ ...newStore, code: e.target.value })}
                      placeholder="MAIN01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="storeAddress">Address</Label>
                    <Textarea
                      id="storeAddress"
                      value={newStore.address}
                      onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                      placeholder="123 Main Street, Cape Town"
                    />
                  </div>
                  <div>
                    <Label htmlFor="storeManager">Manager Name</Label>
                    <Input
                      id="storeManager"
                      value={newStore.manager}
                      onChange={(e) => setNewStore({ ...newStore, manager: e.target.value })}
                      placeholder="John Smith"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={createStoreMutation.isPending}
                    className="w-full"
                  >
                    {createStoreMutation.isPending ? "Adding..." : "Add Store"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Stores ({stores.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stores.map((store: any) => (
                    <div key={store.id} className="p-3 border rounded-lg">
                      <div className="font-medium">{store.name}</div>
                      {store.code && <div className="text-sm text-muted-foreground">Code: {store.code}</div>}
                      {store.manager && <div className="text-sm text-muted-foreground">Manager: {store.manager}</div>}
                      {store.address && <div className="text-xs text-muted-foreground mt-1">{store.address}</div>}
                    </div>
                  ))}
                  {stores.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      No stores added yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales-persons" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New Sales Person
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSalesPersonSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={newSalesPerson.firstName}
                        onChange={(e) => setNewSalesPerson({ ...newSalesPerson, firstName: e.target.value })}
                        placeholder="Sarah"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={newSalesPerson.lastName}
                        onChange={(e) => setNewSalesPerson({ ...newSalesPerson, lastName: e.target.value })}
                        placeholder="Johnson"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="employeeId">Employee ID (Optional)</Label>
                    <Input
                      id="employeeId"
                      value={newSalesPerson.employeeId}
                      onChange={(e) => setNewSalesPerson({ ...newSalesPerson, employeeId: e.target.value })}
                      placeholder="EMP001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newSalesPerson.email}
                      onChange={(e) => setNewSalesPerson({ ...newSalesPerson, email: e.target.value })}
                      placeholder="sarah@company.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="store">Current Store</Label>
                    <Select
                      value={newSalesPerson.currentStoreId}
                      onValueChange={(value) => setNewSalesPerson({ ...newSalesPerson, currentStoreId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a store" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store: any) => (
                          <SelectItem key={store.id} value={store.id.toString()}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    disabled={createSalesPersonMutation.isPending}
                    className="w-full"
                  >
                    {createSalesPersonMutation.isPending ? "Adding..." : "Add Sales Person"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Sales Team ({salesPersons.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {salesPersons.map((person: any) => {
                    const currentStore = stores.find((s: any) => s.id === person.currentStoreId);
                    return (
                      <div key={person.id} className="p-3 border rounded-lg">
                        <div className="font-medium">{person.firstName} {person.lastName}</div>
                        {person.employeeId && <div className="text-sm text-muted-foreground">ID: {person.employeeId}</div>}
                        {person.email && <div className="text-sm text-muted-foreground">{person.email}</div>}
                        {currentStore && <div className="text-xs text-muted-foreground mt-1">Store: {currentStore.name}</div>}
                      </div>
                    );
                  })}
                  {salesPersons.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      No sales persons added yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <h3 className="font-medium mb-2">CSV Import Validation</h3>
        <p className="text-sm text-muted-foreground">
          Once you add your stores and sales persons here, the CSV import will validate sales person names and store names 
          against this data. Sales person names should match exactly: "FirstName LastName" format.
        </p>
      </div>
    </div>
  );
}